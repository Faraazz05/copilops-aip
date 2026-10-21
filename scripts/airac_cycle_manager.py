"""AIRAC 28-Day Cycle Automation Manager.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Calculates ICAO AIRAC cycle dates, orchestrates automated extraction,
runs validation checks, performs cycle-to-cycle diffing, and exports
updated documents into MongoDB / JSON data layers without manual code changes.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import subprocess
import sys

# ICAO AIRAC baseline reference date (Known AIRAC cycle: 2026-01-22)
AIRAC_BASELINE = date(2026, 1, 22)
CYCLE_DAYS = 28


def get_airac_dates_for_year(year: int = 2026) -> list[date]:
    """Generate all 28-day ICAO AIRAC effective dates for a given calendar year."""
    cur = AIRAC_BASELINE
    # Rewind to start of year or advance
    while cur.year > year:
        cur -= timedelta(days=CYCLE_DAYS)
    while cur.year < year:
        cur += timedelta(days=CYCLE_DAYS)

    dates = []
    while cur.year == year:
        dates.append(cur)
        cur += timedelta(days=CYCLE_DAYS)
    return sorted(dates)


def get_current_and_previous_airac(ref_date: date | None = None) -> tuple[date, date]:
    """Return the active AIRAC cycle and the preceding cycle for diff comparisons."""
    if ref_date is None:
        ref_date = date.today()

    cur = AIRAC_BASELINE
    while cur > ref_date:
        cur -= timedelta(days=CYCLE_DAYS)
    while cur + timedelta(days=CYCLE_DAYS) <= ref_date:
        cur += timedelta(days=CYCLE_DAYS)

    current_cycle = cur
    previous_cycle = cur - timedelta(days=CYCLE_DAYS)
    return current_cycle, previous_cycle


def run_airac_pipeline(effective_date: str, html_dir: Path, db_path: Path, previous_date: str | None = None) -> None:
    """Orchestrate the complete 4-stage data pipeline for a new AIRAC cycle."""
    print("=" * 70)
    print(f" [CopilOPS AIRAC Automation] Processing Cycle: {effective_date}")
    print("=" * 70)

    # 1. Extraction & Validation into SQLite
    print("\n[Step 1/3] Parsing eAIP HTML into normalized database...")
    cmd_extract = [
        sys.executable,
        "run_pipeline.py",
        "--html-dir",
        str(html_dir),
        "--effective",
        effective_date,
        "--db",
        str(db_path),
    ]
    subprocess.check_call(cmd_extract)

    # 2. Cycle-to-Cycle Diffing (if previous edition provided)
    if previous_date:
        print(f"\n[Step 2/3] Performing AIRAC change audit ({previous_date} -> {effective_date})...")
        cmd_diff = [
            sys.executable,
            "run_diff.py",
            "--from",
            previous_date,
            "--to",
            effective_date,
            "--db",
            str(db_path),
        ]
        subprocess.check_call(cmd_diff)
    else:
        print("\n[Step 2/3] No previous cycle specified, skipping diff.")

    # 3. Export to JSON / MongoDB bridge
    print("\n[Step 3/3] Exporting structured documents for Node.js API & MongoDB...")
    cmd_export = [
        sys.executable,
        "scripts/export_data.py",
        "--db",
        str(db_path),
        "--edition",
        effective_date,
    ]
    subprocess.check_call(cmd_export)

    print("\n" + "=" * 70)
    print(f" [SUCCESS] Cycle {effective_date} processed, validated, and ready.")
    print("=" * 70)


def main() -> None:
    parser = argparse.ArgumentParser(description="CopilOPS AIRAC 28-day cycle orchestrator")
    parser.add_argument("--effective", help="Effective date YYYY-MM-DD (defaults to latest ICAO cycle)")
    parser.add_argument("--previous", help="Previous date YYYY-MM-DD for diff (defaults to cycle - 28 days)")
    parser.add_argument("--html-dir", help="Path to eAIP HTML directory", default="data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP")
    parser.add_argument("--db", help="Path to SQLite database", default="data/aip.db")
    parser.add_argument("--list-cycles", action="store_true", help="Print all ICAO AIRAC dates for 2026")
    args = parser.parse_args()

    if args.list_cycles:
        cycles = get_airac_dates_for_year(2026)
        print("ICAO 28-Day AIRAC Cycles for 2026:")
        for idx, c in enumerate(cycles, start=1):
            print(f"  Cycle {idx:02d}/2026: {c.isoformat()}")
        return

    effective = args.effective
    previous = args.previous
    if not effective:
        cur, prev = get_current_and_previous_airac()
        effective = cur.isoformat()
        if not previous:
            previous = prev.isoformat()

    run_airac_pipeline(
        effective_date=effective,
        html_dir=Path(args.html_dir),
        db_path=Path(args.db),
        previous_date=previous,
    )


if __name__ == "__main__":
    main()
