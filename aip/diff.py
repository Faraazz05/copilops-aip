"""AIRAC change detection: compare two editions and emit NEW / MODIFIED / DELETED / UNCHANGED.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Usage:
    python run_diff.py --from 2026-09-04 --to 2026-10-01 --db data/aip.db

The `changes` table is idempotent: re-running for the same (from, to) pair
first deletes the previous comparison rows.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

_SCHEMA_CHANGES = """
CREATE TABLE IF NOT EXISTS changes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    from_edition  TEXT NOT NULL,
    to_edition    TEXT NOT NULL,
    status        TEXT NOT NULL,   -- NEW | MODIFIED | DELETED | UNCHANGED
    entity_type   TEXT NOT NULL,
    entity_key    TEXT NOT NULL,
    field         TEXT NOT NULL,
    old_value     TEXT,
    new_value     TEXT,
    unit          TEXT,
    section       TEXT,
    detected_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changes_editions
    ON changes(from_edition, to_edition, status);
"""


@dataclass
class Change:
    status: str          # NEW | MODIFIED | DELETED | UNCHANGED
    entity_type: str
    entity_key: str
    field: str
    old_value: str | None
    new_value: str | None
    unit: str | None
    section: str | None


def _load_edition(conn: sqlite3.Connection, edition: str) -> dict[tuple, dict]:
    """Return {(entity_type, entity_key, field): {value, unit, section}} for one edition."""
    rows = conn.execute(
        "SELECT entity_type, entity_key, field, value, unit, section "
        "FROM facts WHERE edition = ?",
        (edition,),
    ).fetchall()
    result = {}
    for etype, ekey, field, value, unit, section in rows:
        result[(etype, ekey, field)] = {"value": value, "unit": unit, "section": section}
    return result


def compare_editions(
    conn: sqlite3.Connection,
    from_edition: str,
    to_edition: str,
) -> list[Change]:
    """Diff two editions.  Returns every Change record (all statuses)."""
    old = _load_edition(conn, from_edition)
    new = _load_edition(conn, to_edition)

    if not old:
        raise ValueError(f"Edition '{from_edition}' not found in database")
    if not new:
        raise ValueError(f"Edition '{to_edition}' not found in database")

    all_keys = old.keys() | new.keys()
    changes: list[Change] = []

    for key in sorted(all_keys):
        etype, ekey, field = key
        in_old = key in old
        in_new = key in new

        if in_old and in_new:
            old_val = old[key]["value"]
            new_val = new[key]["value"]
            status  = "UNCHANGED" if old_val == new_val else "MODIFIED"
            changes.append(Change(
                status      = status,
                entity_type = etype,
                entity_key  = ekey,
                field       = field,
                old_value   = old_val,
                new_value   = new_val,
                unit        = new[key]["unit"],
                section     = new[key]["section"],
            ))
        elif in_new:
            changes.append(Change(
                status      = "NEW",
                entity_type = etype,
                entity_key  = ekey,
                field       = field,
                old_value   = None,
                new_value   = new[key]["value"],
                unit        = new[key]["unit"],
                section     = new[key]["section"],
            ))
        else:  # in_old only
            changes.append(Change(
                status      = "DELETED",
                entity_type = etype,
                entity_key  = ekey,
                field       = field,
                old_value   = old[key]["value"],
                new_value   = None,
                unit        = old[key]["unit"],
                section     = old[key]["section"],
            ))

    return changes


def write_changes(
    conn: sqlite3.Connection,
    from_edition: str,
    to_edition: str,
    changes: list[Change],
) -> None:
    """Persist change records; idempotent (deletes previous run first)."""
    conn.executescript(_SCHEMA_CHANGES)
    conn.execute(
        "DELETE FROM changes WHERE from_edition=? AND to_edition=?",
        (from_edition, to_edition),
    )
    detected_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    conn.executemany(
        "INSERT INTO changes "
        "(from_edition, to_edition, status, entity_type, entity_key, field,"
        " old_value, new_value, unit, section, detected_at)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
            (from_edition, to_edition, c.status, c.entity_type, c.entity_key,
             c.field, c.old_value, c.new_value, c.unit, c.section, detected_at)
            for c in changes
        ],
    )
    conn.commit()


def format_report(
    changes: list[Change],
    from_edition: str,
    to_edition: str,
    include_unchanged: bool = False,
) -> Iterator[str]:
    """Yield human-readable report lines."""
    yield f"AIRAC change report: {from_edition} → {to_edition}"
    yield "=" * 60

    # Group by (entity_type, entity_key)
    from itertools import groupby
    modified = [c for c in changes if c.status != "UNCHANGED"]
    if not include_unchanged:
        to_report = modified
    else:
        to_report = changes

    last_entity = None
    for c in to_report:
        entity = (c.entity_type, c.entity_key)
        if entity != last_entity:
            yield f"\n{c.entity_type.upper()}: {c.entity_key}"
            last_entity = entity
        unit = f" {c.unit}" if c.unit else ""
        if c.status == "NEW":
            yield f"  + NEW      {c.field} = {c.new_value}{unit}  [{c.section}]"
        elif c.status == "DELETED":
            yield f"  - DELETED  {c.field} = {c.old_value}{unit}  [{c.section}]"
        elif c.status == "MODIFIED":
            yield f"  ~ MODIFIED {c.field}: {c.old_value} → {c.new_value}{unit}  [{c.section}]"
        elif include_unchanged:
            yield f"    UNCHANGED {c.field} = {c.new_value}{unit}"

    # Summary
    counts = {"NEW": 0, "MODIFIED": 0, "DELETED": 0, "UNCHANGED": 0}
    for c in changes:
        counts[c.status] += 1
    yield "\n" + "─" * 60
    yield (f"Summary: {counts['NEW']} NEW, {counts['MODIFIED']} MODIFIED, "
           f"{counts['DELETED']} DELETED, {counts['UNCHANGED']} UNCHANGED")
