"""Parser for ENR 3.2 (Upper ATS Routes / RNAV Routes).

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Extracts ATS routes, navigation specifications (RNAV 5, RNAV 1, RNP),
waypoint sequences, and segment parameters (distance, tracks, limits).
"""
from __future__ import annotations

import re
import warnings
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from .coords import CoordError, parse_lat, parse_lon
from .models import Fact, Issue

_COORD_RE = re.compile(r"(\d{6}[NS])\s+(\d{7}[EW])", re.I)
_DIST_RE = re.compile(r"(\d+(?:\.\d+)?)\s*NM", re.I)
_FL_RE = re.compile(r"(FL\s*\d+|[\d\s]+\s*FT(?:\s*AMSL)?)", re.I)


def _text(el, sep: str = " ") -> str:
    return re.sub(r"\s+", " ", el.get_text(sep, strip=True)).strip()


def parse_routes(html: str):
    """Extract ATS routes from ENR 3.2 HTML."""
    section = "ENR 3.2"
    facts: list[Fact] = []
    issues: list[Issue] = []

    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table", id=lambda x: x and ("RNAVRTE" in x or "RTE" in x))

    if not tables:
        issues.append(Issue("WARN", "STRUCTURE_CHANGED", "route", "*", section,
                            "No tables with RNAVRTE id found in ENR 3.2"))
        return facts, issues

    for t in tables:
        r_id = t.get("id", "").replace("RNAVRTE-", "").replace("RTE-", "")
        route_name = r_id
        rnp_type = None
        availability = None
        waypoints: list[str] = []
        waypoint_coords: dict[str, tuple[float, float]] = {}

        rows = t.find_all("tr")
        prev_wp: str | None = None

        for r in rows:
            tds = r.find_all(["td", "th"])
            txts = [_text(c) for c in tds]
            if not txts:
                continue

            # Header row: e.g. ["L607 {RNAV 5}", "Route availability: (1) H24"]
            if len(txts) >= 2 and re.match(r"^[A-Z]\d+", txts[0]):
                m = re.match(r"^([A-Z0-9]+)(?:\s*\{([^}]+)\})?", txts[0])
                if m:
                    route_name = m.group(1)
                    rnp_type = m.group(2)
                if "availability:" in txts[1].lower():
                    availability = txts[1].replace("Route availability:", "").strip()

            # Waypoint row: contains coordinates
            coord_match = None
            wp_cell_idx = None
            for idx, c_txt in enumerate(txts):
                cm = _COORD_RE.search(c_txt)
                if cm:
                    coord_match = cm
                    wp_cell_idx = idx - 1 if idx > 0 else 0
                    break

            if coord_match and wp_cell_idx is not None:
                raw_name = txts[wp_cell_idx]
                ident_m = re.search(r"\(([A-Z]{3,5})\)", raw_name) or re.match(r"^([A-Z0-9]{3,5})\b", raw_name)
                wp_ident = ident_m.group(1) if ident_m else (raw_name.split()[0] if raw_name else "?")
                
                # Clean up if it was a FIR boundary label
                if wp_ident.upper() not in waypoints:
                    waypoints.append(wp_ident)

                lat_raw, lon_raw = coord_match.group(1), coord_match.group(2)
                try:
                    lat = parse_lat(lat_raw)
                    lon = parse_lon(lon_raw)
                    waypoint_coords[wp_ident] = (lat, lon)
                except CoordError:
                    pass

                # If we had a previous waypoint, create a route segment
                if prev_wp and prev_wp != wp_ident:
                    seg_key = f"{route_name}/{prev_wp}-{wp_ident}"
                    facts.append(Fact("route_segment", seg_key, "route", route_name, None, route_name, section))
                    facts.append(Fact("route_segment", seg_key, "from_point", prev_wp, None, prev_wp, section))
                    facts.append(Fact("route_segment", seg_key, "to_point", wp_ident, None, wp_ident, section))

                prev_wp = wp_ident

            # Segment metrics row (e.g. tracks, distance, limits)
            # Typically 10 or 11 cells with distance like "24.7 NM"
            for c_txt in txts:
                dm = _DIST_RE.search(c_txt)
                if dm and prev_wp and len(waypoints) >= 2:
                    last_from = waypoints[-2]
                    last_to = waypoints[-1]
                    seg_key = f"{route_name}/{last_from}-{last_to}"
                    facts.append(Fact("route_segment", seg_key, "distance", float(dm.group(1)), "NM", c_txt, section))
                    break

        # Facts for the route itself
        if route_name:
            facts.append(Fact("route", route_name, "designator", route_name, None, route_name, section))
            if rnp_type:
                facts.append(Fact("route", route_name, "rnp_type", rnp_type, None, rnp_type, section))
            if availability:
                facts.append(Fact("route", route_name, "availability", availability, None, availability, section))
            if waypoints:
                seq_str = " -> ".join(waypoints)
                facts.append(Fact("route", route_name, "waypoint_sequence", seq_str, None, seq_str, section))
                facts.append(Fact("route", route_name, "waypoint_count", len(waypoints), None, str(len(waypoints)), section))

    return facts, issues
