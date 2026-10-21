"""CLI: compare two AIRAC editions and print a change report.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Usage (from project root):
    python run_diff.py --from 2026-09-04 --to 2026-10-01 --db data/aip.db

    # show only changed records (default)
    python run_diff.py --from 2026-09-04 --to 2026-10-01

    # include unchanged records too
    python run_diff.py --from 2026-09-04 --to 2026-10-01 --all

    # filter to specific entity type
    python run_diff.py --from 2026-09-04 --to 2026-10-01 --type runway
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from aip.db import connect
from aip.diff import compare_editions, format_report, write_changes


def main() -> None:
    ap = argparse.ArgumentParser(description="AIRAC change detection")
    ap.add_argument("--from", dest="from_edition", required=True,
                    help="Older AIRAC effective date YYYY-MM-DD")
    ap.add_argument("--to",   dest="to_edition",   required=True,
                    help="Newer AIRAC effective date YYYY-MM-DD")
    ap.add_argument("--db",   default="data/aip.db")
    ap.add_argument("--all",  action="store_true",
                    help="Include UNCHANGED records in output")
    ap.add_argument("--type", dest="entity_type", default=None,
                    help="Filter to specific entity type (aerodrome, runway, navaid, waypoint)")
    ap.add_argument("--save", action="store_true",
                    help="Persist changes to the 'changes' table in the database")
    args = ap.parse_args()

    conn = connect(args.db)

    try:
        changes = compare_editions(conn, args.from_edition, args.to_edition)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    # Optional entity type filter
    if args.entity_type:
        changes = [c for c in changes if c.entity_type == args.entity_type]

    if args.save:
        write_changes(conn, args.from_edition, args.to_edition, changes)
        print(f"Saved {len(changes)} change records to database.")

    for line in format_report(changes, args.from_edition, args.to_edition,
                               include_unchanged=args.all):
        print(line)

    conn.close()


if __name__ == "__main__":
    main()
