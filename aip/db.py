"""SQLite storage & provenance tracking.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import PARSER_VERSION, SOURCE_NAME, Fact, Issue, SourceContext

SCHEMA = """
CREATE TABLE IF NOT EXISTS editions (
    effective_date TEXT PRIMARY KEY,
    source         TEXT NOT NULL,
    retrieved_at   TEXT NOT NULL,
    parser_version TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS entities (
    edition     TEXT NOT NULL REFERENCES editions(effective_date),
    entity_type TEXT NOT NULL,
    entity_key  TEXT NOT NULL,
    PRIMARY KEY (edition, entity_type, entity_key)
);
CREATE TABLE IF NOT EXISTS facts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    edition        TEXT NOT NULL,
    entity_type    TEXT NOT NULL,
    entity_key     TEXT NOT NULL,
    field          TEXT NOT NULL,
    value          TEXT,            -- always stored as text, typed via value_type
    value_type     TEXT NOT NULL,   -- str | int | float | null
    unit           TEXT,
    raw_text       TEXT,
    source         TEXT NOT NULL,
    section        TEXT NOT NULL,
    source_url     TEXT NOT NULL,
    source_file    TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    retrieved_at   TEXT NOT NULL,
    parser_version TEXT NOT NULL,
    UNIQUE (edition, entity_type, entity_key, field)
);
CREATE TABLE IF NOT EXISTS issues (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    edition     TEXT NOT NULL,
    severity    TEXT NOT NULL,
    code        TEXT NOT NULL,
    entity_type TEXT,
    entity_key  TEXT,
    section     TEXT,
    message     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(edition, entity_type, entity_key);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.executescript(SCHEMA)
    return conn


def reset_edition(conn: sqlite3.Connection, ctx: SourceContext) -> None:
    """Re-running the same edition replaces only that edition."""
    for table in ("facts", "entities", "issues"):
        conn.execute(f"DELETE FROM {table} WHERE edition = ?", (ctx.effective_date,))
    conn.execute("DELETE FROM editions WHERE effective_date = ?", (ctx.effective_date,))
    conn.execute(
        "INSERT INTO editions VALUES (?, ?, ?, ?)",
        (ctx.effective_date, SOURCE_NAME, ctx.retrieved_at, PARSER_VERSION),
    )


def _typed(value):
    if value is None:
        return None, "null"
    if isinstance(value, bool):
        return str(int(value)), "int"
    if isinstance(value, int):
        return str(value), "int"
    if isinstance(value, float):
        return repr(value), "float"
    return str(value), "str"


def write_facts(conn, ctx: SourceContext, filename: str, facts: list[Fact]) -> None:
    url = ctx.url_base + filename
    for f in facts:
        value, vtype = _typed(f.value)
        conn.execute(
            "INSERT OR IGNORE INTO entities VALUES (?, ?, ?)",
            (ctx.effective_date, f.entity_type, f.entity_key),
        )
        try:
            conn.execute(
                "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit,"
                " raw_text, source, section, source_url, source_file, effective_date, retrieved_at,"
                " parser_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (ctx.effective_date, f.entity_type, f.entity_key, f.field, value, vtype, f.unit,
                 f.raw_text, SOURCE_NAME, f.section, url, filename, ctx.effective_date,
                 ctx.retrieved_at, PARSER_VERSION),
            )
        except sqlite3.IntegrityError:
            # same entity+field twice in one edition = duplicate in the source
            write_issues(conn, ctx, [Issue("ERROR", "DUPLICATE_KEY", f.entity_type, f.entity_key,
                                           f.section, f"duplicate value for field '{f.field}'")])


def write_issues(conn, ctx: SourceContext, issues: list[Issue]) -> None:
    for i in issues:
        conn.execute(
            "INSERT INTO issues (edition, severity, code, entity_type, entity_key, section, message)"
            " VALUES (?,?,?,?,?,?,?)",
            (ctx.effective_date, i.severity, i.code, i.entity_type, i.entity_key, i.section, i.message),
        )
