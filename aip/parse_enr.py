"""Parsers for ENR 4.1 (radio navaids) and ENR 4.4 (significant points).

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Each parser takes the html text and returns (facts, issues). They never raise
on bad data: a bad row becomes an Issue, a bad table becomes an Issue, and the
run continues with the other sections.
"""
from __future__ import annotations

import re

import warnings
import bs4
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from .coords import CoordError, parse_lat, parse_lon
from .models import Fact, Issue


def _text(el, sep: str = " ") -> str:
    return re.sub(r"\s+", " ", el.get_text(sep, strip=True)).strip()


def _header_ok(table, first_header_starts_with: str) -> bool:
    first_row = table.find("tr")
    if first_row is None:
        return False
    cells = first_row.find_all("th")
    return bool(cells) and _text(cells[0]).lower().startswith(first_header_starts_with.lower())


def _add_coords(facts, issues, etype, key, section, lat_raw, lon_raw):
    try:
        lat = parse_lat(lat_raw)
        lon = parse_lon(lon_raw)
    except CoordError as exc:
        issues.append(Issue("ERROR", "COORD_PARSE", etype, key, section, str(exc)))
        # keep the raw text so nothing is lost, but store no number
        facts.append(Fact(etype, key, "latitude_raw", lat_raw, None, lat_raw, section))
        facts.append(Fact(etype, key, "longitude_raw", lon_raw, None, lon_raw, section))
        return
    facts.append(Fact(etype, key, "latitude", lat, "deg", lat_raw, section))
    facts.append(Fact(etype, key, "longitude", lon, "deg", lon_raw, section))


def _coord_texts(cell):
    """Coordinates are two <p class='line'> tags: latitude then longitude."""
    ps = cell.find_all("p")
    if len(ps) >= 2:
        return _text(ps[0]), _text(ps[1])
    parts = _text(cell).split()
    return (parts[0], parts[1]) if len(parts) >= 2 else (_text(cell), "")


# --------------------------------------------------------------------- ENR 4.4
def parse_waypoints(html: str):
    section = "ENR 4.4"
    facts: list[Fact] = []
    issues: list[Issue] = []
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None or not _header_ok(table, "Name-code"):
        issues.append(Issue("ERROR", "STRUCTURE_CHANGED", "waypoint", "*", section,
                            "table missing or header no longer starts with 'Name-code designator'"))
        return facts, issues

    for tr in table.find_all("tr"):
        tds = tr.find_all("td", recursive=False)
        if not tds:
            continue  # header rows
        if len(tds) < 2:
            issues.append(Issue("WARN", "ROW_SHAPE", "waypoint", "?", section,
                                f"row with {len(tds)} cells skipped"))
            continue
        key = _text(tds[0])
        if not key:
            issues.append(Issue("WARN", "ROW_SHAPE", "waypoint", "?", section, "row without designator"))
            continue
        lat_raw, lon_raw = _coord_texts(tds[1])
        _add_coords(facts, issues, "waypoint", key, section, lat_raw, lon_raw)
        if len(tds) > 2:
            facts.append(Fact("waypoint", key, "routes_enr_3_2", _text(tds[2]) or None, None, _text(tds[2]), section))
        if len(tds) > 3:
            facts.append(Fact("waypoint", key, "routes_other", _text(tds[3]) or None, None, _text(tds[3]), section))
    return facts, issues


# --------------------------------------------------------------------- ENR 4.1
_FREQ = re.compile(r"(\d+(?:\.\d+)?)\s*(MHZ|KHZ)", re.I)
_CHANNEL = re.compile(r"CH\s*(\d+[XY]?)", re.I)
_MAGVAR = re.compile(r"(\d+(?:\.\d+)?)\s*°\s*([EW])\s*/\s*(\d{4})")
_ELEV = re.compile(r"(-?\d+(?:\.\d+)?)\s*FT", re.I)


def parse_navaids(html: str):
    section = "ENR 4.1"
    facts: list[Fact] = []
    issues: list[Issue] = []
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None or not _header_ok(table, "Name of station"):
        issues.append(Issue("ERROR", "STRUCTURE_CHANGED", "navaid", "*", section,
                            "table missing or header no longer starts with 'Name of station'"))
        return facts, issues

    for tr in table.find_all("tr"):
        tds = tr.find_all("td", recursive=False)
        if not tds:
            continue
        if len(tds) < 5:
            issues.append(Issue("WARN", "ROW_SHAPE", "navaid", tr.get("id", "?"), section,
                                f"row with {len(tds)} cells skipped"))
            continue

        ident = _text(tds[1])
        paras = tds[0].find_all("p")
        navaid_type = _text(paras[0], "") if paras else ""
        key = tr.get("id", "").removeprefix("SP-") or f"{ident}-{navaid_type}"
        name = next(tds[0].stripped_strings, "")

        facts.append(Fact("navaid", key, "name", name, None, name, section))
        facts.append(Fact("navaid", key, "identifier", ident, None, ident, section))
        facts.append(Fact("navaid", key, "type", navaid_type, None, navaid_type, section))

        if len(paras) > 1:
            raw = _text(paras[1], "")
            m = _MAGVAR.search(raw)
            if m:
                val = float(m.group(1)) * (1 if m.group(2) == "E" else -1)
                facts.append(Fact("navaid", key, "magnetic_variation", val, "deg", raw, section))
                facts.append(Fact("navaid", key, "magnetic_variation_year", int(m.group(3)), None, raw, section))

        freq_raw = _text(tds[2])
        m = _FREQ.search(freq_raw)
        if m:
            facts.append(Fact("navaid", key, "frequency", float(m.group(1)), m.group(2).upper(), freq_raw, section))
        else:
            issues.append(Issue("WARN", "FREQ_PARSE", "navaid", key, section, f"no frequency in {freq_raw!r}"))
        m = _CHANNEL.search(freq_raw)
        if m:
            facts.append(Fact("navaid", key, "channel", m.group(1).upper(), None, freq_raw, section))

        hours = _text(tds[3])
        facts.append(Fact("navaid", key, "hours", hours, None, hours, section))

        lat_raw, lon_raw = _coord_texts(tds[4])
        _add_coords(facts, issues, "navaid", key, section, lat_raw, lon_raw)

        if len(tds) > 5:
            elev_raw = _text(tds[5])
            m = _ELEV.search(elev_raw)
            if m:
                facts.append(Fact("navaid", key, "dme_antenna_elevation", float(m.group(1)), "FT", elev_raw, section))
        if len(tds) > 6:
            rem = _text(tds[6])
            if rem:
                facts.append(Fact("navaid", key, "remarks", rem, None, rem, section))
    return facts, issues
