"""Operational summary generator for Flight Dispatchers and OCC.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Extracts an immediate, human-readable operational overview of an airport
from the structured database facts.
"""
from __future__ import annotations

import sqlite3
from typing import Any


def get_airport_operational_view(conn: sqlite3.Connection, icao: str, edition: str | None = None) -> dict[str, Any]:
    """Compile an operational view for a single airport."""
    if edition is None:
        # Get latest edition
        row = conn.execute("SELECT effective_date FROM editions ORDER BY effective_date DESC LIMIT 1").fetchone()
        edition = row[0] if row else "latest"

    # Aerodrome facts
    ad_rows = conn.execute(
        "SELECT field, value, unit, raw_text FROM facts WHERE edition=? AND entity_type='aerodrome' AND entity_key=?",
        (edition, icao),
    ).fetchall()
    ad_facts = {r[0]: r[1] for r in ad_rows}

    # Runways
    rwy_keys = conn.execute(
        "SELECT DISTINCT entity_key FROM facts WHERE edition=? AND entity_type='runway' AND entity_key LIKE ? ORDER BY entity_key",
        (edition, f"{icao}/%"),
    ).fetchall()
    runways = []
    for (rkey,) in rwy_keys:
        r_rows = conn.execute(
            "SELECT field, value, unit FROM facts WHERE edition=? AND entity_type='runway' AND entity_key=?",
            (edition, rkey),
        ).fetchall()
        rf = {r[0]: r[1] for r in r_rows}
        desig = rkey.split("/", 1)[1]
        runways.append({
            "designator": desig,
            "bearing": rf.get("true_bearing"),
            "length": rf.get("length"),
            "width": rf.get("width"),
            "surface": rf.get("surface"),
            "strength": rf.get("strength"),
            "tora": rf.get("tora"),
            "toda": rf.get("toda"),
            "asda": rf.get("asda"),
            "lda": rf.get("lda"),
            "thr_elev": rf.get("thr_elevation"),
            "remarks": rf.get("remarks"),
        })

    # Navaids at airport
    nav_rows = conn.execute(
        "SELECT DISTINCT entity_key FROM facts WHERE edition=? AND entity_type='navaid' AND (entity_key LIKE ? OR entity_key LIKE ?)",
        (edition, f"%{icao}", f"%-{icao}-%"),
    ).fetchall()
    navaids = []
    for (nkey,) in nav_rows:
        n_data = dict(conn.execute(
            "SELECT field, value FROM facts WHERE edition=? AND entity_type='navaid' AND entity_key=?",
            (edition, nkey),
        ).fetchall())
        navaids.append({"key": nkey, **n_data})

    return {
        "icao": icao,
        "edition": edition,
        "operator": ad_facts.get("operator_name", "Unknown"),
        "elevation": ad_facts.get("elevation"),
        "mag_var": ad_facts.get("magnetic_variation"),
        "mag_var_year": ad_facts.get("magnetic_variation_year"),
        "hours_operator": ad_facts.get("hours_operator", "H24"),
        "hours_ats": ad_facts.get("hours_ats", "H24"),
        "hours_customs": ad_facts.get("hours_customs", "H24"),
        "hours_ais": ad_facts.get("hours_ais", "H24"),
        "rffs_category": ad_facts.get("rffs_category_text") or (f"CAT {ad_facts.get('rffs_category')}" if ad_facts.get("rffs_category") else "—"),
        "runways": runways,
        "navaids": navaids,
    }


def format_operational_view(view: dict[str, Any]) -> str:
    """Format operational view into Flight Dispatcher friendly text."""
    icao = view["icao"]
    lines = [
        "===============================================================",
        f"  OPERATIONAL AIRPORT SUMMARY: {icao} - {view['operator']}",
        f"  AIP Effective Cycle: {view['edition']} | skeyes Belgium & Luxembourg",
        "===============================================================",
        "",
        ">> AERODROME SPECIFICATIONS",
        f"  Elevation:          {view['elevation'] or 'NIL'} FT AMSL",
        f"  Magnetic Variation: {view['mag_var']} deg ({view['mag_var_year']})" if view['mag_var'] is not None else "  Magnetic Variation: NIL",
        f"  RFFS Category:      {view['rffs_category']}",
        "",
        ">> OPERATING HOURS",
        f"  Airport Operator:   {view['hours_operator']}",
        f"  ATS / Tower:        {view['hours_ats']}",
        f"  Customs & Imm.:     {view['hours_customs']}",
        f"  AIS Briefing:       {view['hours_ais']}",
        "",
        ">> RUNWAYS & DECLARED DISTANCES",
    ]

    if not view["runways"]:
        lines.append("  (No runway physical data published in AD 2.12)")
    else:
        lines.append(f"  {'RWY':<6} {'BRG':<10} {'DIMENSIONS':<14} {'SURF':<8} {'TORA (M)':<10} {'TODA (M)':<10} {'ASDA (M)':<10} {'LDA (M)':<10}")
        lines.append(f"  {'-'*76}")
        for r in view["runways"]:
            brg = f"{r['bearing']} deg" if r['bearing'] is not None else "NIL"
            try:
                dims = f"{int(float(r['length']))}x{int(float(r['width']))}" if r['length'] and r['width'] else "NIL"
            except (ValueError, TypeError):
                dims = "NIL"
            surf = r['surface'] or "NIL"
            try:
                tora = str(int(float(r['tora']))) if r['tora'] else "NIL"
            except (ValueError, TypeError):
                tora = "NIL"
            try:
                toda = str(int(float(r['toda']))) if r['toda'] else "NIL"
            except (ValueError, TypeError):
                toda = "NIL"
            try:
                asda = str(int(float(r['asda']))) if r['asda'] else "NIL"
            except (ValueError, TypeError):
                asda = "NIL"
            try:
                lda  = str(int(float(r['lda']))) if r['lda'] else "NIL"
            except (ValueError, TypeError):
                lda = "NIL"
            lines.append(f"  {r['designator']:<6} {brg:<10} {dims:<14} {surf:<8} {tora:<10} {toda:<10} {asda:<10} {lda:<10}")

    lines.append("")
    lines.append(">> RADIO NAVIGATION & LANDING AIDS")
    if not view["navaids"]:
        lines.append("  (See en-route / regional navigation facilities)")
    else:
        for n in view["navaids"]:
            ntype = n.get("type") or n.get("ils_system", "Aid")
            ident = n.get("identifier", n["key"])
            freq = f"{n.get('frequency')} {n.get('frequency_unit', 'MHZ')}" if n.get('frequency') else ""
            lines.append(f"  * {ntype:<18} ID: {ident:<8} {freq}")

    lines.append("")
    lines.append("=" * 63)
    return "\n".join(lines)
