"""CLI tool to display operational summary for Flight Dispatchers / OCC.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Usage:
    python show_airport.py EBBR
    python show_airport.py EBLG
    python show_airport.py EBCI
    python show_airport.py --all
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from aip.db import connect
from aip.operational import get_airport_operational_view, format_operational_view

TARGETS = ["EBBR", "EBLG", "EBCI"]


def main():
    ap = argparse.ArgumentParser(description="Aviation Operational Summary (OCC / Dispatcher)")
    ap.add_argument("icao", nargs="?", default=None, help="Airport ICAO code (e.g. EBBR, EBLG, EBCI)")
    ap.add_argument("--db", default="data/aip.db", help="Path to SQLite database")
    ap.add_argument("--edition", default=None, help="AIRAC edition date (default: latest)")
    ap.add_argument("--all", action="store_true", help="Show all 3 target airports (EBBR, EBLG, EBCI)")
    args = ap.parse_args()

    conn = connect(args.db)

    icaos = TARGETS if args.all or not args.icao else [args.icao.upper()]

    for code in icaos:
        view = get_airport_operational_view(conn, code, args.edition)
        print(format_operational_view(view))
        print()

    conn.close()


if __name__ == "__main__":
    main()
