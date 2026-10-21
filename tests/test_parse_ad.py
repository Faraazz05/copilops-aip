"""Tests for AD section parsers (AD 2.2, 2.3, 2.6, 2.12, 2.13, 2.18, 2.19)."""
from pathlib import Path

import pytest

from aip.parse_ad import (
    parse_aerodrome,
    parse_ad_2_2,
    parse_ad_2_3,
    parse_ad_2_6,
    parse_ad_2_12,
    parse_ad_2_13,
    parse_ad_2_18,
    parse_ad_2_19,
)

FIX = Path(__file__).parent / "fixtures"
EBBR_HTML = (FIX / "ad2_ebbr_sample.html").read_text(encoding="utf-8")
ICAO = "EBBR"


def by_key_field(facts, key, field):
    return next((f for f in facts if f.entity_key == key and f.field == field), None)


def by_field(facts, field):
    return next((f for f in facts if f.field == field), None)


# ── AD 2.2 ────────────────────────────────────────────────────────────────────

class TestAD22:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_2(EBBR_HTML, ICAO)

    def test_arp_latitude(self):
        f = by_key_field(self.facts, ICAO, "arp_latitude")
        assert f is not None
        assert f.value == pytest.approx(50.901389, abs=1e-4)
        assert f.unit == "deg"

    def test_arp_longitude(self):
        f = by_key_field(self.facts, ICAO, "arp_longitude")
        assert f is not None
        assert f.value == pytest.approx(4.484444, abs=1e-4)

    def test_elevation(self):
        f = by_key_field(self.facts, ICAO, "elevation")
        assert f is not None
        assert f.value == 175.0
        assert f.unit == "FT"

    def test_geoid_undulation(self):
        f = by_key_field(self.facts, ICAO, "geoid_undulation")
        assert f is not None
        assert f.value == 149.0

    def test_magnetic_variation(self):
        f = by_key_field(self.facts, ICAO, "magnetic_variation")
        assert f is not None
        assert f.value == 2.0   # East is positive
        assert f.unit == "deg"

    def test_magnetic_variation_year(self):
        f = by_key_field(self.facts, ICAO, "magnetic_variation_year")
        assert f is not None
        assert f.value == 2025

    def test_operator_name(self):
        f = by_key_field(self.facts, ICAO, "operator_name")
        assert f is not None
        assert "Brussels Airport" in f.value

    def test_no_issues(self):
        assert self.issues == []

    def test_structure_change_reported(self):
        """Missing div must create an Issue, never crash or return facts."""
        bad_html = "<html><body><p>nothing here</p></body></html>"
        facts, issues = parse_ad_2_2(bad_html, ICAO)
        assert facts == []
        assert any(i.code == "STRUCTURE_CHANGED" for i in issues)


# ── AD 2.3 ────────────────────────────────────────────────────────────────────

class TestAD23:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_3(EBBR_HTML, ICAO)

    def test_operator_hours(self):
        f = by_key_field(self.facts, ICAO, "hours_operator")
        assert f is not None
        assert f.value == "H24"

    def test_ats_hours(self):
        f = by_key_field(self.facts, ICAO, "hours_ats")
        assert f is not None
        assert f.value == "H24"

    def test_customs_hours(self):
        f = by_key_field(self.facts, ICAO, "hours_customs")
        assert f is not None

    def test_section_label(self):
        assert all(f.section == f"{ICAO} AD 2.3" for f in self.facts)

    def test_missing_section_returns_empty_not_crash(self):
        """Section absent → no facts, no issues, no crash."""
        facts, issues = parse_ad_2_3("<html><body></body></html>", ICAO)
        assert facts == [] and issues == []


# ── AD 2.6 ────────────────────────────────────────────────────────────────────

class TestAD26:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_6(EBBR_HTML, ICAO)

    def test_rffs_category_number(self):
        f = by_key_field(self.facts, ICAO, "rffs_category")
        assert f is not None
        assert f.value == 10

    def test_rffs_category_text(self):
        f = by_key_field(self.facts, ICAO, "rffs_category_text")
        assert f is not None
        assert "CAT 10" in f.value


# ── AD 2.12 ───────────────────────────────────────────────────────────────────

class TestAD212:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_12(EBBR_HTML, ICAO)

    def test_rwy07r_bearing(self):
        f = by_key_field(self.facts, "EBBR/07R", "true_bearing")
        assert f is not None
        assert f.value == pytest.approx(69.89, abs=0.01)
        assert f.unit == "deg"

    def test_rwy07r_length(self):
        f = by_key_field(self.facts, "EBBR/07R", "length")
        assert f is not None
        assert f.value == 3210.0
        assert f.unit == "M"

    def test_rwy07r_width(self):
        f = by_key_field(self.facts, "EBBR/07R", "width")
        assert f is not None
        assert f.value == 45.0

    def test_rwy07r_surface(self):
        f = by_key_field(self.facts, "EBBR/07R", "surface")
        assert f is not None
        assert f.value == "ASPH"

    def test_rwy07r_thr_latitude(self):
        f = by_key_field(self.facts, "EBBR/07R", "thr_latitude")
        assert f is not None
        assert f.value == pytest.approx(50.889414, abs=1e-4)

    def test_rwy07r_thr_longitude(self):
        f = by_key_field(self.facts, "EBBR/07R", "thr_longitude")
        assert f is not None
        assert f.value == pytest.approx(4.482056, abs=1e-4)

    def test_rwy07r_thr_elevation(self):
        f = by_key_field(self.facts, "EBBR/07R", "thr_elevation")
        assert f is not None
        assert f.value == 166.4

    def test_rwy07r_no_tdz_when_absent(self):
        """07R has no TDZ in the fixture — field must be absent (not None-valued)."""
        f = by_key_field(self.facts, "EBBR/07R", "tdz_elevation")
        assert f is None

    def test_rwy25l_tdz_present(self):
        f = by_key_field(self.facts, "EBBR/25L", "tdz_elevation")
        assert f is not None
        assert f.value == 156.9

    def test_rwy07r_end_coords(self):
        f = by_key_field(self.facts, "EBBR/07R", "end_latitude")
        assert f is not None

    def test_rwy07r_geoid_undulation(self):
        f = by_key_field(self.facts, "EBBR/07R", "thr_geoid_undulation")
        assert f is not None
        assert f.value == 149.1

    def test_entity_type(self):
        assert all(f.entity_type == "runway" for f in self.facts)

    def test_structure_change_reported(self):
        facts, issues = parse_ad_2_12("<html><body></body></html>", ICAO)
        assert facts == []
        assert any(i.code == "STRUCTURE_CHANGED" for i in issues)


# ── AD 2.13 ───────────────────────────────────────────────────────────────────

class TestAD213:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_13(EBBR_HTML, ICAO)

    def test_07r_tora(self):
        f = by_key_field(self.facts, "EBBR/07R", "tora")
        assert f is not None
        assert f.value == 2893.0
        assert f.unit == "M"

    def test_07r_lda(self):
        f = by_key_field(self.facts, "EBBR/07R", "lda")
        assert f is not None
        assert f.value == 3088.0

    def test_25l_toda(self):
        f = by_key_field(self.facts, "EBBR/25L", "toda")
        assert f is not None
        assert f.value == 3210.0

    def test_07r_remark(self):
        f = by_key_field(self.facts, "EBBR/07R", "remarks")
        assert f is not None
        assert "TKOF" in f.value

    def test_25l_nil_remark_not_stored(self):
        """NIL remarks should not create a Fact."""
        f = by_key_field(self.facts, "EBBR/25L", "remarks")
        assert f is None

    def test_no_issues(self):
        assert self.issues == []


# ── AD 2.18 ───────────────────────────────────────────────────────────────────

class TestAD218:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_18(EBBR_HTML, ICAO)

    def test_app_frequency_found(self):
        # At least one ATS frequency must be found
        freq_facts = [f for f in self.facts if "freq" in f.field]
        assert len(freq_facts) >= 1

    def test_frequency_unit(self):
        freq_facts = [f for f in self.facts if "freq" in f.field]
        assert all(f.unit in ("MHZ", "KHZ") for f in freq_facts)


# ── AD 2.19 ───────────────────────────────────────────────────────────────────

class TestAD219:
    def setup_method(self):
        self.facts, self.issues = parse_ad_2_19(EBBR_HTML, ICAO)

    def test_dvor_frequency(self):
        facts = [f for f in self.facts if f.field == "frequency"
                 and "BUB" in f.entity_key]
        assert len(facts) == 1
        assert facts[0].value == pytest.approx(114.6)

    def test_dvor_coords(self):
        lat_facts = [f for f in self.facts if f.field == "latitude"
                     and "BUB" in f.entity_key]
        assert len(lat_facts) == 1

    def test_ils_loc_frequency(self):
        loc_facts = [f for f in self.facts if "LOC" in f.entity_key and f.field == "frequency"]
        assert len(loc_facts) >= 1
        assert loc_facts[0].value == pytest.approx(109.9)

    def test_ils_system_link(self):
        """LOC fact must carry ils_system back-reference."""
        loc = next((f for f in self.facts if "LOC" in f.entity_key
                    and f.field == "ils_system"), None)
        assert loc is not None


# ── Combined parse_aerodrome ──────────────────────────────────────────────────

class TestParseAerodrome:
    def setup_method(self):
        self.facts, self.issues = parse_aerodrome(EBBR_HTML, ICAO)

    def test_entity_types_present(self):
        etypes = {f.entity_type for f in self.facts}
        assert "aerodrome" in etypes
        assert "runway" in etypes
        assert "navaid" in etypes

    def test_provenance_section_set(self):
        assert all(f.section for f in self.facts), "All facts must have a section"

    def test_raw_text_always_set(self):
        assert all(f.raw_text is not None for f in self.facts), "raw_text must always be set"


# ── Real-data smoke test: EBBR, EBLG, EBCI ───────────────────────────────────

class TestRealAirports:
    """Parse all three required airports from raw eAIP data."""

    HTML_DIR = Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP")

    @pytest.mark.skipif(
        not (Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP")).exists(),
        reason="raw eAIP data not present"
    )
    @pytest.mark.parametrize("icao", ["EBBR", "EBLG", "EBCI"])
    def test_no_parser_crash(self, icao):
        html_path = self.HTML_DIR / f"EB-AD-2.{icao}-en-GB.html"
        assert html_path.exists(), f"Source file missing: {html_path}"
        html = html_path.read_text(encoding="utf-8", errors="replace")
        facts, issues = parse_aerodrome(html, icao)
        crash_issues = [i for i in issues if i.code == "PARSER_CRASH"]
        assert crash_issues == [], f"Parser crashed for {icao}: {crash_issues}"

    @pytest.mark.skipif(
        not (Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP")).exists(),
        reason="raw eAIP data not present"
    )
    @pytest.mark.parametrize("icao", ["EBBR", "EBLG", "EBCI"])
    def test_runway_facts_extracted(self, icao):
        html_path = self.HTML_DIR / f"EB-AD-2.{icao}-en-GB.html"
        html = html_path.read_text(encoding="utf-8", errors="replace")
        facts, _ = parse_aerodrome(html, icao)
        runway_facts = [f for f in facts if f.entity_type == "runway"]
        assert len(runway_facts) > 0, f"No runway facts for {icao}"

    @pytest.mark.skipif(
        not (Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP")).exists(),
        reason="raw eAIP data not present"
    )
    @pytest.mark.parametrize("icao", ["EBBR", "EBLG", "EBCI"])
    def test_arp_coords_extracted(self, icao):
        html_path = self.HTML_DIR / f"EB-AD-2.{icao}-en-GB.html"
        html = html_path.read_text(encoding="utf-8", errors="replace")
        facts, _ = parse_aerodrome(html, icao)
        lat = next((f for f in facts if f.entity_key == icao
                    and f.field == "arp_latitude"), None)
        assert lat is not None, f"No ARP latitude for {icao}"
        assert 49.0 < lat.value < 52.0, f"ARP lat {lat.value} out of Belgium range"
