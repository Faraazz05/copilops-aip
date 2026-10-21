import sqlite3
import pytest
from aip.db import connect
from aip.diff import compare_editions, format_report, write_changes, Change
from aip.models import SourceContext


def _setup_test_db(db_path):
    conn = connect(db_path)
    # Insert two editions
    conn.execute("INSERT INTO editions VALUES ('2026-09-04', 'skeyes', '2026-09-04T00:00:00Z', '0.1.0')")
    conn.execute("INSERT INTO editions VALUES ('2026-10-01', 'skeyes', '2026-10-01T00:00:00Z', '0.1.0')")

    # Facts in edition 1 (2026-09-04)
    # 1. Unchanged fact
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-09-04', 'runway', 'EBBR/07R', 'tora', '2893', 'float', 'M', '2893', 'skeyes', 'EBBR AD 2.13', '', '', '2026-09-04', '', '0.1.0')"
    )
    # 2. Fact to be modified
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-09-04', 'runway', 'EBBR/25L', 'lda', '3211', 'float', 'M', '3211', 'skeyes', 'EBBR AD 2.13', '', '', '2026-09-04', '', '0.1.0')"
    )
    # 3. Fact to be deleted in edition 2
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-09-04', 'waypoint', 'OLDWP', 'latitude', '50.123', 'float', 'deg', '50.123', 'skeyes', 'ENR 4.4', '', '', '2026-09-04', '', '0.1.0')"
    )

    # Facts in edition 2 (2026-10-01)
    # 1. Unchanged fact
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-10-01', 'runway', 'EBBR/07R', 'tora', '2893', 'float', 'M', '2893', 'skeyes', 'EBBR AD 2.13', '', '', '2026-10-01', '', '0.1.0')"
    )
    # 2. Modified fact (LDA 3211 -> 3151)
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-10-01', 'runway', 'EBBR/25L', 'lda', '3151', 'float', 'M', '3151', 'skeyes', 'EBBR AD 2.13', '', '', '2026-10-01', '', '0.1.0')"
    )
    # 3. New fact appearing in edition 2
    conn.execute(
        "INSERT INTO facts (edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version) "
        "VALUES ('2026-10-01', 'waypoint', 'NEWWP', 'latitude', '51.456', 'float', 'deg', '51.456', 'skeyes', 'ENR 4.4', '', '', '2026-10-01', '', '0.1.0')"
    )

    conn.commit()
    return conn


def test_compare_editions(tmp_path):
    db_file = tmp_path / "test.db"
    conn = _setup_test_db(db_file)

    changes = compare_editions(conn, "2026-09-04", "2026-10-01")
    assert len(changes) == 4

    by_key = {(c.entity_type, c.entity_key, c.field): c for c in changes}

    # Unchanged
    c_unchanged = by_key[("runway", "EBBR/07R", "tora")]
    assert c_unchanged.status == "UNCHANGED"
    assert c_unchanged.old_value == "2893"
    assert c_unchanged.new_value == "2893"

    # Modified
    c_mod = by_key[("runway", "EBBR/25L", "lda")]
    assert c_mod.status == "MODIFIED"
    assert c_mod.old_value == "3211"
    assert c_mod.new_value == "3151"
    assert c_mod.unit == "M"

    # Deleted
    c_del = by_key[("waypoint", "OLDWP", "latitude")]
    assert c_del.status == "DELETED"
    assert c_del.old_value == "50.123"
    assert c_del.new_value is None

    # New
    c_new = by_key[("waypoint", "NEWWP", "latitude")]
    assert c_new.status == "NEW"
    assert c_new.old_value is None
    assert c_new.new_value == "51.456"


def test_missing_edition_raises(tmp_path):
    db_file = tmp_path / "test.db"
    conn = _setup_test_db(db_file)
    with pytest.raises(ValueError, match="not found"):
        compare_editions(conn, "2025-01-01", "2026-10-01")


def test_write_and_report_changes(tmp_path):
    db_file = tmp_path / "test.db"
    conn = _setup_test_db(db_file)

    changes = compare_editions(conn, "2026-09-04", "2026-10-01")
    write_changes(conn, "2026-09-04", "2026-10-01", changes)

    # Check persistence
    saved = conn.execute("SELECT status, entity_key, field, old_value, new_value FROM changes").fetchall()
    assert len(saved) == 4

    # Format report
    report = list(format_report(changes, "2026-09-04", "2026-10-01"))
    report_text = "\n".join(report)
    assert "EBBR/25L" in report_text
    assert "3211" in report_text
    assert "3151" in report_text
    assert "Summary: 1 NEW, 1 MODIFIED, 1 DELETED, 1 UNCHANGED" in report_text
