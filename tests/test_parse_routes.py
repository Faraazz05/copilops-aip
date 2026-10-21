from pathlib import Path
import pytest
from aip.parse_routes import parse_routes

HTML_PATH = Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP/EB-ENR-3.2-en-GB.html")


@pytest.mark.skipif(not HTML_PATH.exists(), reason="raw eAIP data not present")
def test_parse_routes_real_data():
    html = HTML_PATH.read_text(encoding="utf-8", errors="replace")
    facts, issues = parse_routes(html)

    assert len(facts) > 0
    route_keys = {f.entity_key for f in facts if f.entity_type == "route"}
    assert "L607" in route_keys
    assert "L179" in route_keys

    # Check L607 fields
    l607_facts = {f.field: f for f in facts if f.entity_key == "L607"}
    assert "rnp_type" in l607_facts
    assert "RNAV 5" in l607_facts["rnp_type"].value
    assert "waypoint_sequence" in l607_facts
    assert "KONAN" in l607_facts["waypoint_sequence"].value

    # Check segments
    segments = [f for f in facts if f.entity_type == "route_segment"]
    assert len(segments) > 0


def test_parse_routes_empty():
    facts, issues = parse_routes("<html><body><p>No tables here</p></body></html>")
    assert facts == []
    assert len(issues) == 1
    assert issues[0].code == "STRUCTURE_CHANGED"
