from pathlib import Path

from aip.parse_enr import parse_navaids, parse_waypoints

FIX = Path(__file__).parent / "fixtures"


def by_field(facts, key):
    return {f.field: f for f in facts if f.entity_key == key}


def test_waypoints_good_and_bad_row():
    facts, issues = parse_waypoints((FIX / "enr44_sample.html").read_text(encoding="utf-8"))
    good = by_field(facts, "ABBUW")
    assert good["latitude"].value == 50.131111
    assert good["latitude"].raw_text == "500752N"
    assert "DARK FALCON" in good["routes_other"].value
    # the corrupt row must raise an issue and must NOT get a numeric latitude
    assert [i.code for i in issues] == ["COORD_PARSE"]
    bad = by_field(facts, "BADPT")
    assert "latitude" not in bad and "latitude_raw" in bad


def test_navaid_fields():
    facts, issues = parse_navaids((FIX / "enr41_sample.html").read_text(encoding="utf-8"))
    assert issues == []
    n = by_field(facts, "AFI-DVORDME")
    assert n["name"].value == "Affligem"
    assert n["type"].value == "DVOR/DME"
    assert n["identifier"].value == "AFI"
    assert (n["frequency"].value, n["frequency"].unit) == (114.9, "MHZ")
    assert n["channel"].value == "96X"
    assert n["hours"].value == "H24"
    assert n["magnetic_variation"].value == 2.0
    assert n["magnetic_variation_year"].value == 2025
    assert n["dme_antenna_elevation"].value == 300.0
    assert n["latitude"].value == 50.907778


def test_structure_change_is_reported_not_swallowed():
    facts, issues = parse_waypoints("<html><body><table><tr><th>Something else</th></tr></table></body></html>")
    assert facts == [] and issues[0].code == "STRUCTURE_CHANGED"
