"""Parsers for AD 2.2, 2.3, 2.6, 2.12, 2.13, 2.18, 2.19 sections.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Covers aerodrome geographical data, operational hours, RFFS, runway physical
characteristics, declared distances, ATS comms, and radio nav / landing aids.

Each public parse_* function returns (facts, issues) and never raises on bad
data — a bad cell becomes an Issue and the run continues.
"""
from __future__ import annotations

import re
import warnings
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from .coords import CoordError, parse_lat, parse_lon
from .models import Fact, Issue

# ── small helpers ──────────────────────────────────────────────────────────────

def _text(el, sep: str = " ") -> str:
    return re.sub(r"\s+", " ", el.get_text(sep, strip=True)).strip()


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "lxml")


def _fact(icao: str, etype: str, key: str, field: str, value, unit, raw: str, section: str) -> Fact:
    return Fact(etype, key, field, value, unit, raw, section)


def _issue(sev: str, code: str, etype: str, key: str, section: str, msg: str) -> Issue:
    return Issue(sev, code, etype, key, section, msg)


# ── coordinate helpers ────────────────────────────────────────────────────────

_COORD_PAIR = re.compile(
    r"(\d{6}(?:\.\d+)?)([NS]?)\s+(\d{7}(?:\.\d+)?)([EW])", re.I
)
_COORD_NEWLINE = re.compile(
    r"(\d{6}(?:\.\d+)?)([NS]?)\s*[\r\n]+\s*(\d{7}(?:\.\d+)?)([EW])", re.I
)


def _parse_coord_pair(raw: str, facts: list, issues: list,
                       etype: str, key: str, section: str,
                       lat_field: str = "latitude", lon_field: str = "longitude") -> None:
    """Parse 'DDMMSSN DDDMMSSE' or newline-separated pair into two Fact rows."""
    if not raw or not raw.strip() or raw.strip() in ("-", "NIL", "—"):
        return

    cleaned = re.sub(r"\s+", " ", raw).strip()
    m = _COORD_PAIR.search(cleaned) or _COORD_NEWLINE.search(raw)
    if not m:
        issues.append(_issue("ERROR", "COORD_PARSE", etype, key, section,
                              f"no coord pair found in {raw!r}"))
        facts.append(Fact(etype, key, lat_field + "_raw", raw, None, raw, section))
        return

    lat_digits, lat_hemi, lon_digits, lon_hemi = m.group(1), m.group(2), m.group(3), m.group(4)
    if not lat_hemi:
        # Known AIP typo (e.g. EBCI RWY 24 end coord where 'N' was omitted by publisher)
        issues.append(_issue("WARN", "MISSING_HEMISPHERE", etype, key, section,
                              f"latitude {lat_digits!r} missing hemisphere letter 'N' in AIP publication"))
        lat_hemi = "N"

    lat_raw = f"{lat_digits}{lat_hemi.upper()}"
    lon_raw = f"{lon_digits}{lon_hemi.upper()}"

    try:
        lat = parse_lat(lat_raw)
        lon = parse_lon(lon_raw)
    except CoordError as exc:
        issues.append(_issue("ERROR", "COORD_PARSE", etype, key, section, str(exc)))
        facts.append(Fact(etype, key, lat_field + "_raw", raw, None, raw, section))
        return
    facts.append(Fact(etype, key, lat_field, lat, "deg", lat_raw, section))
    facts.append(Fact(etype, key, lon_field, lon, "deg", lon_raw, section))


# ── regex patterns ────────────────────────────────────────────────────────────

_FT    = re.compile(r"(-?\d+(?:\.\d+)?)\s*FT", re.I)
_M     = re.compile(r"([\d\s]+)\s*[xX\u00d7]\s*(\d+)")          # "2 987 x 50" or "728 × 30"
_BRG   = re.compile(r"(\d+(?:\.\d+)?)\s*°?")
_FREQ  = re.compile(r"(\d+(?:\.\d+)?)\s*(MHZ|KHZ)", re.I)
_MAGVAR = re.compile(r"(\d+(?:\.\d+)?)\s*°?\s*([EW])\s*[/\(]\s*(\d{4})")


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.1 — Aerodrome Location Indicator and Name
# ══════════════════════════════════════════════════════════════════════════════

def parse_ad_2_1(html: str, icao: str):
    """Extract official aerodrome name (distinct from operator name)."""
    section = f"{icao} AD 2.1"
    etype = "aerodrome"
    key = icao
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    el = soup.find(lambda t: t.name in ["h2", "h3", "h4"] and icao in t.get_text())
    if el:
        raw = _text(el)
        m = re.search(rf"{icao}\s*[\u2011\-\—\s]*(.+)", raw)
        if m:
            name = m.group(1).strip()
            facts.append(Fact(etype, key, "aerodrome_name", name, None, raw, section))
            return facts, issues

    div = soup.find(id=lambda x: x and f"{icao}-AD-2.1" in x)
    if div:
        raw = _text(div)
        m = re.search(rf"{icao}\s*[\u2011\-\—\s]*(.+)", raw)
        if m:
            name = m.group(1).strip()
            facts.append(Fact(etype, key, "aerodrome_name", name, None, raw, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.2 — Aerodrome Geographical and Administrative Data
# ══════════════════════════════════════════════════════════════════════════════

def parse_ad_2_2(html: str, icao: str):
    """Extract aerodrome identification, ARP coords, elevation, mag var, etc."""
    section = f"{icao} AD 2.2"
    etype   = "aerodrome"
    key     = icao
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.2")
    if div is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, key, section,
                              f"div#{icao}-AD-2.2 not found"))
        return facts, issues

    table = div.find("table")
    if table is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, key, section,
                              "table not found in AD 2.2 div"))
        return facts, issues

    # The table has 3 columns: row#, field-label, value
    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        label = _text(tds[1]).lower()
        raw   = _text(tds[2])

        if "arp coord" in label:
            _parse_coord_pair(raw, facts, issues, etype, key, section,
                               "arp_latitude", "arp_longitude")

        elif "elevation" in label and "reference" in label:
            m = _FT.search(raw)
            if m:
                facts.append(Fact(etype, key, "elevation", float(m.group(1)), "FT", raw, section))
            else:
                issues.append(_issue("WARN", "ELEV_PARSE", etype, key, section,
                                      f"no elevation in {raw!r}"))

        elif "geoid undulation" in label:
            m = _FT.search(raw)
            if m:
                facts.append(Fact(etype, key, "geoid_undulation", float(m.group(1)), "FT", raw, section))

        elif "magnetic variation" in label and "annual" in label:
            m = _MAGVAR.search(raw)
            if m:
                val = float(m.group(1)) * (1 if m.group(2) == "E" else -1)
                facts.append(Fact(etype, key, "magnetic_variation",      val,             "deg", raw, section))
                facts.append(Fact(etype, key, "magnetic_variation_year", int(m.group(3)), None,  raw, section))

        elif "name of ad operator" in label:
            facts.append(Fact(etype, key, "operator_name", raw or None, None, raw, section))

        elif "direction and distance" in label:
            facts.append(Fact(etype, key, "direction_from_city", raw or None, None, raw, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.3 — Operational Hours
# ══════════════════════════════════════════════════════════════════════════════

_HOURS_MAP = {
    "ad operator":              "hours_operator",
    "customs":                  "hours_customs",
    "health and sanitation":    "hours_health",
    "ais briefing":             "hours_ais",
    "ats reporting":            "hours_aro",
    "met briefing":             "hours_met",
    "ats":                      "hours_ats",
    "fuelling":                 "hours_fuelling",
    "handling":                 "hours_handling",
    "security":                 "hours_security",
    "de-icing":                 "hours_deicing",
}


def parse_ad_2_3(html: str, icao: str):
    """Extract operational hours (H24, HX, schedule text)."""
    section = f"{icao} AD 2.3"
    etype   = "aerodrome"
    key     = icao
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.3")
    if div is None:
        return facts, issues   # Many small aerodromes may not have this section

    table = div.find("table")
    if table is None:
        return facts, issues

    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        label_raw = _text(tds[1]).lower()
        value     = _text(tds[2])
        field     = None
        for keyword, fname in _HOURS_MAP.items():
            if keyword in label_raw:
                field = fname
                break
        if field is None:
            field = "hours_" + re.sub(r"\W+", "_", label_raw.strip())[:30]
        facts.append(Fact(etype, key, field, value or None, None, value, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.6 — Rescue and Fire Fighting
# ══════════════════════════════════════════════════════════════════════════════

def parse_ad_2_6(html: str, icao: str):
    """Extract RFFS category."""
    section = f"{icao} AD 2.6"
    etype   = "aerodrome"
    key     = icao
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.6")
    if div is None:
        return facts, issues

    table = div.find("table")
    if table is None:
        return facts, issues

    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 3:
            continue
        label = _text(tds[1]).lower()
        value = _text(tds[2])
        if "category for fire" in label or "aerodrome category" in label:
            # extract CAT number
            m = re.search(r"CAT\s*(\d+)", value, re.I)
            cat_val = int(m.group(1)) if m else None
            facts.append(Fact(etype, key, "rffs_category",      cat_val,       None, value, section))
            facts.append(Fact(etype, key, "rffs_category_text", value or None, None, value, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.12 — Runway Physical Characteristics
# ══════════════════════════════════════════════════════════════════════════════

def _parse_thr_elev(raw: str) -> tuple[float | None, float | None]:
    """Return (thr_elev, tdz_elev) from e.g. 'THR 174.8 FT TDZ 174.8 FT'."""
    thr = re.search(r"THR\s+(-?\d+(?:\.\d+)?)\s*FT", raw, re.I)
    tdz = re.search(r"TDZ\s+(-?\d+(?:\.\d+)?)\s*FT", raw, re.I)
    return (float(thr.group(1)) if thr else None,
            float(tdz.group(1)) if tdz else None)


def _parse_dims(raw: str) -> tuple[float | None, float | None]:
    """Parse '2 987 x 50' or '3210 x 45' → (length, width)."""
    # strip narrow-space / thin-space unicode
    cleaned = re.sub(r"[\u2009\u202f\s]", "", raw)
    m = re.search(r"(\d+)[xX](\d+)", cleaned)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None


def _parse_bearing(raw: str) -> float | None:
    m = re.search(r"(\d+(?:\.\d+)?)\s*°?", raw)
    return float(m.group(1)) if m else None


def _parse_strength_surface(raw: str) -> tuple[str | None, str | None]:
    """Split e.g. '720/F/A/X/T 120/F/A/W/T ASPH' → (strength, surface)."""
    # Surface is the last all-caps word like ASPH, CONC, GRASS
    surface_m = re.search(r"\b(ASPH|CONC|GRAS|GRASS|DIRT|GRAVEL|SAND|MACADAM|BITUMEN)\b", raw, re.I)
    surface   = surface_m.group(1).upper() if surface_m else None
    # Strength = everything before the surface keyword (or full string)
    if surface_m:
        strength = raw[:surface_m.start()].strip()
    else:
        strength = raw.strip() or None
    return strength or None, surface


def parse_ad_2_12(html: str, icao: str):
    """Extract runway physical characteristics from AD 2.12.

    The table uses rowspan=3 per runway:
      Row 0: designator, bearing, dims, strength/surface, THR coord, THR/TDZ elev
      Row 1: RWY end coord (single cell)
      Row 2: THR geoid undulation (single cell)
    """
    section = f"{icao} AD 2.12"
    etype   = "runway"
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.12")
    if div is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, f"{icao}/*", section,
                              f"div#{icao}-AD-2.12 not found"))
        return facts, issues

    table = div.find("table")
    if table is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, f"{icao}/*", section,
                              "table not found in AD 2.12"))
        return facts, issues

    data_rows = [tr for tr in table.find_all("tr")
                 if tr.find("td")]   # skip pure-header rows

    i = 0
    while i < len(data_rows):
        tr = data_rows[i]
        tds = tr.find_all("td", recursive=False)

        # ── Skip the column-number header row (cells are 1,2,3,4,5,6) ─────────
        if len(tds) == 6 and all(_text(t) in ("1","2","3","4","5","6") for t in tds):
            i += 1
            continue

        # ── Main runway row (6 cells with rowspan) ────────────────────────────
        if len(tds) == 6:
            desig_raw  = _text(tds[0])
            brg_raw    = _text(tds[1])
            dims_raw   = _text(tds[2])
            str_raw    = _text(tds[3])
            thr_raw    = _text(tds[4])
            elev_raw   = _text(tds[5])

            desig = desig_raw.strip()
            key   = f"{icao}/{desig}"

            if not desig:
                issues.append(_issue("WARN", "ROW_SHAPE", etype, f"{icao}/?", section,
                                      "6-cell row with empty designator"))
                i += 1
                continue

            # bearing
            brg = _parse_bearing(brg_raw)
            if brg is not None:
                facts.append(Fact(etype, key, "true_bearing", brg, "deg", brg_raw, section))
            else:
                issues.append(_issue("WARN", "BRG_PARSE", etype, key, section,
                                      f"no bearing in {brg_raw!r}"))

            # dimensions
            length, width = _parse_dims(dims_raw)
            if length is not None:
                facts.append(Fact(etype, key, "length", length, "M", dims_raw, section))
                facts.append(Fact(etype, key, "width",  width,  "M", dims_raw, section))
            else:
                issues.append(_issue("WARN", "DIM_PARSE", etype, key, section,
                                      f"no dimensions in {dims_raw!r}"))

            # strength / surface
            strength, surface = _parse_strength_surface(str_raw)
            if strength:
                facts.append(Fact(etype, key, "strength", strength, None, str_raw, section))
            if surface:
                facts.append(Fact(etype, key, "surface",  surface,  None, str_raw, section))

            # THR coordinates
            _parse_coord_pair(thr_raw, facts, issues, etype, key, section,
                               "thr_latitude", "thr_longitude")

            # THR / TDZ elevations
            thr_elev, tdz_elev = _parse_thr_elev(elev_raw)
            if thr_elev is not None:
                facts.append(Fact(etype, key, "thr_elevation", thr_elev, "FT", elev_raw, section))
            if tdz_elev is not None:
                facts.append(Fact(etype, key, "tdz_elevation", tdz_elev, "FT", elev_raw, section))

            # ── Row+1: RWY end coordinates ────────────────────────────────────
            if i + 1 < len(data_rows):
                tr2 = data_rows[i + 1]
                tds2 = tr2.find_all("td", recursive=False)
                if len(tds2) == 1:
                    end_raw = _text(tds2[0])
                    _parse_coord_pair(end_raw, facts, issues, etype, key, section,
                                       "end_latitude", "end_longitude")

            # ── Row+2: THR geoid undulation ───────────────────────────────────
            if i + 2 < len(data_rows):
                tr3 = data_rows[i + 2]
                tds3 = tr3.find_all("td", recursive=False)
                if len(tds3) == 1:
                    geo_raw = _text(tds3[0])
                    m = _FT.search(geo_raw)
                    if m:
                        facts.append(Fact(etype, key, "thr_geoid_undulation",
                                          float(m.group(1)), "FT", geo_raw, section))

            i += 3   # consumed 3 rows
            continue

        # ── Stray single-cell rows already consumed above, skip them ─────────
        i += 1

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.13 — Declared Distances
# ══════════════════════════════════════════════════════════════════════════════

def _to_metres(raw: str) -> float | None:
    """Strip narrow-space unicode and convert to float."""
    cleaned = re.sub(r"[\u2009\u202f\xa0\s]", "", raw)
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_ad_2_13(html: str, icao: str):
    """Extract TORA, TODA, ASDA, LDA declared distances from AD 2.13."""
    section = f"{icao} AD 2.13"
    etype   = "runway"
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.13")
    if div is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, f"{icao}/*", section,
                              f"div#{icao}-AD-2.13 not found"))
        return facts, issues

    table = div.find("table")
    if table is None:
        issues.append(_issue("ERROR", "STRUCTURE_CHANGED", etype, f"{icao}/*", section,
                              "table not found in AD 2.13"))
        return facts, issues

    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 5:
            continue
        desig = _text(tds[0]).strip()
        if not desig or desig in ("1", "2", "3", "4", "5", "6"):
            continue   # header rows

        key = f"{icao}/{desig}"

        for field, col_idx in (("tora", 1), ("toda", 2), ("asda", 3), ("lda", 4)):
            raw = _text(tds[col_idx])
            val = _to_metres(raw)
            if val is not None:
                facts.append(Fact(etype, key, field, val, "M", raw, section))
            elif raw.upper() not in ("NIL", "-", ""):
                issues.append(_issue("WARN", "DIST_PARSE", etype, key, section,
                                      f"cannot parse {field} from {raw!r}"))

        if len(tds) > 5:
            rmk = _text(tds[5])
            if rmk and rmk.upper() != "NIL":
                facts.append(Fact(etype, key, "remarks", rmk, None, rmk, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.18 — ATS Communication Facilities
# ══════════════════════════════════════════════════════════════════════════════

def parse_ad_2_18(html: str, icao: str):
    """Extract ATS frequencies (APP, TWR, GND, ATIS, etc.)."""
    section = f"{icao} AD 2.18"
    etype   = "aerodrome"
    key     = icao
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.18")
    if div is None:
        return facts, issues

    table = div.find("table")
    if table is None:
        return facts, issues

    current_service = None
    seen: dict[str, int] = {}    # count occurrences to deduplicate field names

    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue

        # 5-column rows: service, callsign, freq, hours, remarks
        if len(tds) >= 4:
            svc_raw  = _text(tds[0])
            freq_raw = _text(tds[2]) if len(tds) > 2 else ""

            # new service designation in col 0
            if svc_raw and not svc_raw.isdigit():
                current_service = re.sub(r"\s+", "_", svc_raw.strip().upper())[:30]

            if current_service is None:
                continue

            # try to grab frequency
            m = _FREQ.search(freq_raw)
            if m:
                base_field = f"ats_{current_service}_freq"
                n = seen.get(base_field, 0)
                field = base_field if n == 0 else f"{base_field}_{n}"
                seen[base_field] = n + 1
                facts.append(Fact(etype, key, field,
                                  float(m.group(1)), m.group(2).upper(),
                                  freq_raw, section))

        # continuation row with just a frequency (service not repeated)
        elif len(tds) == 1 and current_service:
            freq_raw = _text(tds[0])
            m = _FREQ.search(freq_raw)
            if m:
                base_field = f"ats_{current_service}_freq"
                n = seen.get(base_field, 0)
                field = base_field if n == 0 else f"{base_field}_{n}"
                seen[base_field] = n + 1
                facts.append(Fact(etype, key, field,
                                  float(m.group(1)), m.group(2).upper(),
                                  freq_raw, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# AD 2.19 — Radio Navigation and Landing Aids
# ══════════════════════════════════════════════════════════════════════════════

def parse_ad_2_19(html: str, icao: str):
    """Extract ILS, VOR, NDB, DME, RNAV aids published under the aerodrome."""
    section = f"{icao} AD 2.19"
    etype   = "navaid"
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = _soup(html)
    div = soup.find(id=f"{icao}-AD-2.19")
    if div is None:
        return facts, issues

    table = div.find("table")
    if table is None:
        return facts, issues

    current_ils: str | None = None   # e.g. "ILS 07R"
    seen_keys: set[str] = set()

    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue

        # Detect ILS system header row: may be 1 wide cell (colspan=7) or 7+ cells
        # with "ILS XX (CAT Y)" in the first cell / full text
        full_text = _text(tr)
        ils_m = re.match(r"ILS\s+(\d+[LRC]?(?:/\d+[LRC]?)?)[\s(]", full_text, re.I)
        if ils_m and len(tds) <= 2:
            current_ils = f"ILS-{icao}-{ils_m.group(1).replace('/','-')}"
            cat_m = re.search(r"CAT\s+([I]+\s?[ABC]?)", full_text, re.I)
            if cat_m:
                facts.append(Fact(etype, current_ils, "ils_category",
                                  cat_m.group(1).strip(), None, full_text, section))
            continue   # ILS heading row — sub-components follow

        # 7-column data row: type/magvar, ID, freq, hours, coords, dme elev, remarks
        if len(tds) >= 5:
            type_raw = _text(tds[0])
            id_raw   = _text(tds[1])
            freq_raw = _text(tds[2]) if len(tds) > 2 else ""
            coord_raw = _text(tds[4]) if len(tds) > 4 else ""
            rem_raw = _text(tds[6]) if len(tds) > 6 else ""

            # Detect ILS system row (type contains "ILS") in multi-column format
            ils_m2 = re.match(r"ILS\s+(\d+[LRC]?(?:/\d+[LRC]?)?)(?:\s*[\(\[])?", type_raw, re.I)
            if ils_m2:
                current_ils = f"ILS-{icao}-{ils_m2.group(1).replace('/','-')}"
                cat_m = re.search(r"CAT\s+([I]+\s?[ABC]?)", type_raw, re.I)
                if cat_m:
                    facts.append(Fact(etype, current_ils, "ils_category",
                                      cat_m.group(1).strip(), None, type_raw, section))
                continue  # ILS heading row — sub-components follow

            # sub-components: LOC, GP, DME under ILS
            subtype = re.sub(r"\s+", "", type_raw).upper()
            if subtype in ("LOC", "GP", "DME", "GPINTERSYSTEM") and current_ils:
                key = f"{current_ils}-{subtype}"
                facts.append(Fact(etype, key, "type",       subtype,       None, type_raw, section))
                facts.append(Fact(etype, key, "ils_system", current_ils,   None, type_raw, section))
                if id_raw:
                    facts.append(Fact(etype, key, "identifier", id_raw, None, id_raw, section))
                m = _FREQ.search(freq_raw)
                if m:
                    facts.append(Fact(etype, key, "frequency",
                                      float(m.group(1)), m.group(2).upper(), freq_raw, section))
                if coord_raw:
                    _parse_coord_pair(coord_raw, facts, issues, etype, key, section)
                # DME elev
                if len(tds) > 5:
                    elev_raw = _text(tds[5])
                    em = _FT.search(elev_raw)
                    if em:
                        facts.append(Fact(etype, key, "dme_antenna_elevation",
                                          float(em.group(1)), "FT", elev_raw, section))
                continue

            # Standalone DVOR, NDB, DVOR/DME, Marker Beacons (OM, MM), etc.
            nav_type = re.sub(r"\s*/\s*", "/", type_raw.split("(")[0].strip())
            nav_type_clean = re.sub(r"\W+", "", nav_type).upper()[:20]
            if not id_raw or not nav_type_clean:
                current_ils = None
                continue
            current_ils = None

            # Disambiguate marker beacons (e.g. OM / MM with id "dash / dash") using runway
            thr_match = re.search(r"THR\s*(\d+[LRC]?)", rem_raw, re.I)
            if thr_match and nav_type_clean in ("OM", "MM", "IM"):
                key = f"{nav_type_clean}-RWY{thr_match.group(1).upper()}-{icao}"
            else:
                key = f"{id_raw}-{nav_type_clean}-{icao}"

            if key in seen_keys:
                idx = 2
                while f"{key}-{idx}" in seen_keys:
                    idx += 1
                key = f"{key}-{idx}"
            seen_keys.add(key)

            facts.append(Fact(etype, key, "name",       id_raw,         None, id_raw,   section))
            facts.append(Fact(etype, key, "type",       nav_type,       None, type_raw, section))
            facts.append(Fact(etype, key, "identifier", id_raw,         None, id_raw,   section))
            facts.append(Fact(etype, key, "aerodrome",  icao,           None, icao,     section))
            m = _FREQ.search(freq_raw)
            if m:
                facts.append(Fact(etype, key, "frequency",
                                  float(m.group(1)), m.group(2).upper(), freq_raw, section))
            if coord_raw:
                _parse_coord_pair(coord_raw, facts, issues, etype, key, section)
            if len(tds) > 5:
                elev_raw = _text(tds[5])
                em = _FT.search(elev_raw)
                if em:
                    facts.append(Fact(etype, key, "dme_antenna_elevation",
                                      float(em.group(1)), "FT", elev_raw, section))
            if rem_raw:
                facts.append(Fact(etype, key, "remarks", rem_raw, None, rem_raw, section))

    return facts, issues


# ══════════════════════════════════════════════════════════════════════════════
# Convenience: parse all AD sections for one airport
# ══════════════════════════════════════════════════════════════════════════════

def parse_aerodrome(html: str, icao: str):
    """Run all AD sub-parsers and merge results."""
    all_facts: list[Fact]  = []
    all_issues: list[Issue] = []

    for parser in (parse_ad_2_1, parse_ad_2_2, parse_ad_2_3, parse_ad_2_6,
                   parse_ad_2_12, parse_ad_2_13,
                   parse_ad_2_18, parse_ad_2_19):
        f, i = parser(html, icao)
        all_facts.extend(f)
        all_issues.extend(i)

    return all_facts, all_issues
