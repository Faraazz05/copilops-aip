"""Parse one AIRAC edition into the SQLite database.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Example (from the project root):
    python run_pipeline.py ^
      --html-dir "data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP" ^
      --effective 2026-10-01 --db data/aip.db
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path

from aip import db
from aip.models import Issue, SourceContext
from aip.parse_enr import parse_navaids, parse_waypoints
from aip.parse_routes import parse_routes
from aip.parse_ad import parse_aerodrome

import bs4  # noqa: F401 – imported for version visibility

# (file name, parser). ENR sections are filename-keyed; AD airports are globbed below.
ENR_PARSERS = [
    ("EB-ENR-4.4-en-GB.html", parse_waypoints),
    ("EB-ENR-4.1-en-GB.html", parse_navaids),
    ("EB-ENR-3.2-en-GB.html", parse_routes),
]

PUBLIC_BASE = "https://ops.skeyes.be/html/belgocontrol_static/eaip/{folder}/html/eAIP/"


def url_base_for(html_dir: Path) -> str:
    for part in html_dir.parts:
        if part in ("eAIP_Main", "eAIP_Next", "eAIP_Previous"):
            return PUBLIC_BASE.format(folder=part)
    return PUBLIC_BASE.format(folder="eAIP_Main")


def _run_parser(conn, ctx, filename, parser, label=""):
    """Run one parser function and write results; return (entities, facts, issues) counts."""
    path = ctx.html_dir / filename
    if not path.exists():
        db.write_issues(conn, ctx, [Issue("ERROR", "SOURCE_MISSING", "-", "-", filename,
                                          f"file not found: {path}")])
        print(f"[MISSING] {filename}")
        return 0, 0, 0
    try:
        html = path.read_text(encoding="utf-8", errors="replace")
        facts, issues = parser(html)
    except Exception as exc:
        db.write_issues(conn, ctx, [Issue("ERROR", "PARSER_CRASH", "-", "-", filename, repr(exc))])
        print(f"[CRASH]   {filename}: {exc!r}")
        return 0, 0, 0
    db.write_facts(conn, ctx, filename, facts)
    db.write_issues(conn, ctx, issues)
    entities = len({(f.entity_type, f.entity_key) for f in facts})
    tag = label or filename
    print(f"[OK]      {tag}: {entities} entities, {len(facts)} facts, {len(issues)} issues")
    return entities, len(facts), len(issues)


def _run_ad_parser(conn, ctx, html_path: Path, icao: str):
    """Run the aerodrome parser for one airport HTML file."""
    try:
        html = html_path.read_text(encoding="utf-8", errors="replace")
        facts, issues = parse_aerodrome(html, icao)
    except Exception as exc:
        db.write_issues(conn, ctx, [Issue("ERROR", "PARSER_CRASH", "aerodrome", icao,
                                          html_path.name, repr(exc))])
        print(f"[CRASH]   {html_path.name}: {exc!r}")
        return 0, 0, 0
    db.write_facts(conn, ctx, html_path.name, facts)
    db.write_issues(conn, ctx, issues)
    rwy_count = len({f.entity_key for f in facts if f.entity_type == "runway"})
    print(f"[OK]      {icao}: {len(facts)} facts, {rwy_count} runways, {len(issues)} issues")
    return 1, len(facts), len(issues)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--html-dir", required=True)
    ap.add_argument("--effective", required=True, help="AIRAC effective date, YYYY-MM-DD")
    ap.add_argument("--db", default="data/aip.db")
    ap.add_argument("--airports-only", action="store_true",
                    help="Skip ENR parsers, run only AD parsers")
    ap.add_argument("--enr-only", action="store_true",
                    help="Skip AD parsers, run only ENR parsers")
    args = ap.parse_args()

    html_dir = Path(args.html_dir)
    ctx = SourceContext(
        html_dir=html_dir,
        effective_date=args.effective,
        retrieved_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        url_base=url_base_for(html_dir),
    )

    conn = db.connect(args.db)
    db.reset_edition(conn, ctx)

    # ── ENR parsers ────────────────────────────────────────────────────────────
    if not args.airports_only:
        print("\n--- ENR sections ---")
        for filename, parser in ENR_PARSERS:
            _run_parser(conn, ctx, filename, parser)

    # ---- AD parsers (all EB-AD-2.* airports) ---------------------------------
    if not args.enr_only:
        ad_files = sorted(html_dir.glob("EB-AD-2.*-en-GB.html"))
        print(f"\n--- AD sections ({len(ad_files)} airports) ---")
        total_ad_facts = 0
        for html_path in ad_files:
            # Extract ICAO from filename: EB-AD-2.EBBR-en-GB.html → EBBR
            stem_parts = html_path.stem.split(".")
            if len(stem_parts) < 2:
                continue
            icao = stem_parts[1].split("-")[0]
            _, f_count, _ = _run_ad_parser(conn, ctx, html_path, icao)
            total_ad_facts += f_count
        print(f"\n  Total AD facts: {total_ad_facts}")

    conn.commit()

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\nEntities per type:")
    for etype, n in conn.execute(
        "SELECT entity_type, COUNT(DISTINCT entity_key) FROM entities WHERE edition=?"
        " GROUP BY entity_type", (ctx.effective_date,)
    ):
        print(f"  {etype}: {n}")

    print("\nIssues:")
    for sev, code, n in conn.execute(
        "SELECT severity, code, COUNT(*) FROM issues WHERE edition=? GROUP BY severity, code",
        (ctx.effective_date,)
    ):
        print(f"  {sev} {code}: {n}")

    conn.close()


if __name__ == "__main__":
    main()
