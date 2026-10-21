"""Tests for Airspace parsing and geometry extraction (ENR 2.1 & ENR 5.1)."""
from pathlib import Path
import pytest

from aip.parse_airspace import (
    generate_circle_polygon,
    parse_vertical_limits,
    parse_enr_2_1,
    parse_enr_5_1,
)

SAMPLE_ENR_51 = """
<div class="Heading4">
  <h4>2 RESTRICTED AREAS</h4>
  <table id="EBR01">
    <tr>
      <th>Lateral limits</th><th>Vertical limits</th>
      <th>Type of restriction / nature of hazard</th><th>Time of activity</th>
    </tr>
    <tr>
      <td>505311N 0042013E - an arc of circle, 0.8 NM radius, centred on 505311N 0042130E and traced clockwise to 505316N 0042247E.</td>
      <td>UNL / GND</td>
      <td>Entry prohibited, unless instructed by ATC.</td>
      <td>PERM</td>
    </tr>
  </table>
  <table id="EBR02">
    <tr>
      <th>Lateral limits</th><th>Vertical limits</th>
      <th>Type of restriction / nature of hazard</th><th>Time of activity</th>
    </tr>
    <tr>
      <td>A circle, 0.8 NM radius, centred on 500958N 0050628E.</td>
      <td>UNL / GND</td>
      <td>Entry prohibited, unless instructed by ATC.</td>
      <td>PERM</td>
    </tr>
  </table>
  <table id="EBR04">
    <tr>
      <th>Lateral limits</th><th>Vertical limits</th>
      <th>Type of restriction / nature of hazard</th><th>Time of activity</th>
    </tr>
    <tr>
      <td>503117N 0061200E - along the Belgian-German border - 502557N 0062234E - 503117N 0061200E.</td>
      <td>FL 170 / GND</td>
      <td>Gunnery area.</td>
      <td>HX</td>
    </tr>
  </table>
  <table id="EBR99_LINEAR">
    <tr>
      <th>Lateral limits</th><th>Vertical limits</th>
      <th>Type of restriction / nature of hazard</th><th>Time of activity</th>
    </tr>
    <tr>
      <td>510723N 0053455E - 510157N 0053455E - 505929N 0051951E - 510723N 0053455E.</td>
      <td>FL 100 / GND</td>
      <td>Firing exercises.</td>
      <td>HX</td>
    </tr>
  </table>
</div>
"""

SAMPLE_ENR_21 = """
<div class="Heading4">
  <h4>1 UPPER AIRSPACE</h4>
  <p>Liège TMA One</p>
  <table>
    <tr><td>Lateral limits</td><td>504935N 0053857E - along the Belgian-Dutch border - 504515N 0060116E - 504935N 0053857E.</td></tr>
    <tr><td>Vertical limits</td><td>FL 195 / FL 095</td></tr>
    <tr><td>Airspace class</td><td>C</td></tr>
    <tr><td>Control units</td><td>Brussels ACC</td></tr>
    <tr><td>OPR HR</td><td>H24</td></tr>
  </table>
  <p>Antwerpen TMA One</p>
  <table>
    <tr><td>Lateral limits</td><td>511500N 0041500E - 511500N 0044500E - 510500N 0044500E - 510500N 0041500E - 511500N 0041500E.</td></tr>
    <tr><td>Vertical limits</td><td>4500 FT AMSL / 1500 FT AMSL</td></tr>
    <tr><td>Airspace class</td><td>C</td></tr>
    <tr><td>Control units</td><td>Antwerpen APP</td></tr>
    <tr><td>OPR HR</td><td>H24</td></tr>
  </table>
</div>
"""


class TestAirspaceGeometry:
    def test_circle_polygon_generation(self):
        lat, lon, radius_nm = 50.5, 4.5, 2.0
        ring = generate_circle_polygon(lat, lon, radius_nm, num_points=36)
        assert len(ring) == 37  # 36 segments + closed last point
        # Ring must be closed
        assert ring[0] == ring[-1]
        # Coordinates must be [lon, lat]
        for p in ring:
            assert len(p) == 2
            assert 4.0 <= p[0] <= 5.0   # lon
            assert 50.0 <= p[1] <= 51.0  # lat

    def test_vertical_limits_parser(self):
        u, l, ref = parse_vertical_limits("FL 195 / FL 095")
        assert u == "FL 195"
        assert l == "FL 095"
        assert ref == "FL"

        u2, l2, ref2 = parse_vertical_limits("3500 FT AMSL / GND")
        assert u2 == "3500 FT AMSL"
        assert l2 == "GND"
        assert ref2 == "AMSL"

    def test_parse_enr_51_circular_area(self):
        airspaces, issues = parse_enr_5_1(SAMPLE_ENR_51)
        ebr02 = next((a for a in airspaces if "EBR02" in a["designation"]), None)
        assert ebr02 is not None
        assert ebr02["validation_status"] == "VALID"
        assert ebr02["geometry"] is not None
        assert ebr02["geometry"]["type"] == "Polygon"
        assert len(ebr02["geometry"]["coordinates"][0]) == 37
        assert ebr02["upper_limit"] == "UNL"
        assert ebr02["lower_limit"] == "GND"

    def test_parse_enr_51_arc_exclusion(self):
        airspaces, issues = parse_enr_5_1(SAMPLE_ENR_51)
        ebr01 = next((a for a in airspaces if "EBR01" in a["designation"]), None)
        assert ebr01 is not None
        assert ebr01["validation_status"] == "ARC_UNRESOLVED"
        assert ebr01["geometry"] is None
        # Must preserve original text without fabricating points
        assert "arc of circle" in ebr01["boundary_text"]
        # Must produce an explicit issue
        assert any(i.code == "AIRSPACE_ARC_EXCLUDED" and "EBR01" in i.entity_key for i in issues)

    def test_parse_enr_51_border_exclusion(self):
        airspaces, issues = parse_enr_5_1(SAMPLE_ENR_51)
        ebr04 = next((a for a in airspaces if "EBR04" in a["designation"]), None)
        assert ebr04 is not None
        assert ebr04["validation_status"] == "BORDER_UNRESOLVED"
        assert ebr04["geometry"] is None
        assert "Belgian-German border" in ebr04["boundary_text"]
        assert any(i.code == "AIRSPACE_BORDER_EXCLUDED" for i in issues)

    def test_parse_enr_51_linear_polygon(self):
        airspaces, issues = parse_enr_5_1(SAMPLE_ENR_51)
        ebr99 = next((a for a in airspaces if "EBR99" in a["designation"]), None)
        assert ebr99 is not None
        assert ebr99["validation_status"] == "VALID"
        assert ebr99["geometry"] is not None
        assert ebr99["geometry"]["type"] == "Polygon"
        ring = ebr99["geometry"]["coordinates"][0]
        assert len(ring) == 4  # 3 vertices + 1 closure
        assert ring[0] == ring[-1]

    def test_parse_enr_21_border_and_polygon(self):
        airspaces, issues = parse_enr_2_1(SAMPLE_ENR_21)
        assert len(airspaces) == 2
        
        # Border feature excluded from geometry
        liege = next(a for a in airspaces if "Liège" in a["name"])
        assert liege["validation_status"] == "BORDER_UNRESOLVED"
        assert liege["geometry"] is None
        assert "border" in liege["boundary_text"].lower()

        # Pure coordinate polygon accepted
        antwerp = next(a for a in airspaces if "Antwerpen" in a["name"])
        assert antwerp["validation_status"] == "VALID"
        assert antwerp["geometry"] is not None
        assert len(antwerp["geometry"]["coordinates"][0]) >= 4

    def test_out_of_bounds_coordinates(self):
        sample_oob = """
        <div class="Heading4">
          <table id="EBR_OOB">
            <tr><th>Lateral limits</th><th>Vertical limits</th><th>Type</th><th>Time</th></tr>
            <tr>
              <td>000000N 0000000E - 000000N 0010000E - 010000N 0000000E - 000000N 0000000E.</td>
              <td>UNL / GND</td><td>Restricted</td><td>H24</td>
            </tr>
          </table>
        </div>
        """
        airspaces, issues = parse_enr_5_1(sample_oob)
        assert len(airspaces) == 1
        assert airspaces[0]["validation_status"] in ("OUT_OF_RANGE", "INVALID_GEOMETRY")
        assert airspaces[0]["geometry"] is None

    def test_real_enr_files_smoke(self):
        path_51 = Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP/EB-ENR-5.1-en-GB.html")
        path_21 = Path("data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP/EB-ENR-2.1-en-GB.html")
        if path_51.exists() and path_21.exists():
            a51, i51 = parse_enr_5_1(path_51.read_text(encoding="utf-8", errors="replace"))
            a21, i21 = parse_enr_2_1(path_21.read_text(encoding="utf-8", errors="replace"))
            assert len(a51) >= 50
            assert sum(1 for a in a51 if a["geometry"] is not None) >= 40
            assert len(a21) >= 30
            assert sum(1 for a in a21 if a["geometry"] is not None) >= 10
