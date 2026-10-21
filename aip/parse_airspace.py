"""Parser for Airspace and Special-Use Airspace (ENR 2.1 and ENR 5.1).

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform

Extracts FIR/UIR, CTA, TMA, CTR, Restricted (EBR), Danger (EBD), Prohibited (EBP),
and UAS zones with deterministic geometry validation, circle generation, and structured
issue tracking for unmodeled boundary segments (e.g. national borders, complex arcs).
"""
from __future__ import annotations

import math
import re
import warnings
from typing import Any
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

from .coords import parse_lat, parse_lon, CoordError
from .models import Issue

# Benelux FIR loose bounding box for sanity checks
MIN_LAT, MAX_LAT = 49.0, 52.0
MIN_LON, MAX_LON = 2.0, 7.0

# Circle regex supporting both "A circle, 0.8 NM radius, centred on ..." and "A circle radius 2.5 NM centered on ..."
CIRCLE_RE = re.compile(
    r"[Aa]\s+circle,?\s*(?:([\d.]+)\s*NM\s+radius|radius\s+([\d.]+)\s*NM),?\s*centre?d\s+on\s*(\d{6}[NS])\s*(\d{7}[EW])",
    re.I
)

# Coordinate pair regex (DDMMSSN DDDMMSSE)
COORD_PAIR_RE = re.compile(r"(\d{6}[NS])\s+(\d{7}[EW])")


def _clean_text(s: str) -> str:
    """Normalize typography whitespace."""
    if not s:
        return ""
    # Replace non-breaking spaces and unicode hyphens
    s = s.replace("\xa0", " ").replace("\u202f", " ").replace("\u2009", " ")
    s = s.replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    return re.sub(r"\s+", " ", s).strip()


def generate_circle_polygon(lat_deg: float, lon_deg: float, radius_nm: float, num_points: int = 36) -> list[list[float]]:
    """Generate a closed GeoJSON ring [lon, lat] for a circle on a spherical Earth."""
    d = radius_nm * 1852.0  # 1 NM = 1852 meters
    R = 6371000.0           # Mean Earth radius in meters
    delta = d / R
    lat1 = math.radians(lat_deg)
    lon1 = math.radians(lon_deg)
    ring: list[list[float]] = []

    for i in range(num_points + 1):
        bearing = math.radians(i * 360.0 / num_points)
        lat2 = math.asin(math.sin(lat1) * math.cos(delta) + math.cos(lat1) * math.sin(delta) * math.cos(bearing))
        lon2 = lon1 + math.atan2(
            math.sin(bearing) * math.sin(delta) * math.cos(lat1),
            math.cos(delta) - math.sin(lat1) * math.sin(lat2)
        )
        ring.append([round(math.degrees(lon2), 6), round(math.degrees(lat2), 6)])
    return ring


def parse_vertical_limits(text: str) -> tuple[str, str, str | None]:
    """Parse upper, lower limits and vertical reference from text (e.g. 'FL 195 / FL 095' or 'UNL / GND')."""
    cleaned = _clean_text(text)
    # Strip footnote markers like (1), (2)
    cleaned = re.sub(r"\(\d+\)", "", cleaned).strip()
    if "/" in cleaned:
        parts = [p.strip() for p in cleaned.split("/", 1)]
        upper = parts[0]
        lower = parts[1]
    else:
        upper = cleaned
        lower = "GND"

    # Identify vertical reference
    ref = None
    if "AMSL" in cleaned.upper():
        ref = "AMSL"
    elif "FL" in cleaned.upper():
        ref = "FL"
    elif "GND" in cleaned.upper() or "SFC" in cleaned.upper():
        ref = "GND"

    return upper, lower, ref


def parse_enr_5_1(html: str, source_url: str = "", effective_date: str = "2026-10-01") -> tuple[list[dict[str, Any]], list[Issue]]:
    """Parse ENR 5.1 (Prohibited, Restricted, and Danger Areas)."""
    section = "ENR 5.1"
    source_file = "EB-ENR-5.1-en-GB.html"
    airspaces: list[dict[str, Any]] = []
    issues: list[Issue] = []

    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table")

    for idx, table in enumerate(tables):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Extract title from the table or table id or preceding div/p
        t_id = table.get("id", "")
        table_text = _clean_text(table.get_text(" ", strip=True))
        title_match = re.search(r"\b(EB[PRD]\d+[A-Z0-9]*)\s*-\s*([A-Z0-9\s\-\(\)\/\.\,]+?)(?=\s+Lateral\s+limits|\s*$)", table_text, re.I)
        
        if title_match:
            desig = title_match.group(1).upper()
            name = _clean_text(title_match.group(2))
        elif t_id and re.match(r"^EB[PRD]\d+", t_id, re.I):
            desig = t_id.upper()
            name = desig
        else:
            # Fallback to search preceding sibling / parent heading
            prev = table.find_previous(lambda t: t.name in ["h4", "h5", "p", "div"] and re.search(r"\bEB[PRD]\d+", t.get_text()))
            p_txt = _clean_text(prev.get_text(" ", strip=True)) if prev else ""
            m_prev = re.search(r"\b(EB[PRD]\d+[A-Z0-9]*)(?:\s*-\s*([^,\.\(]+))?", p_txt)
            if m_prev:
                desig = m_prev.group(1).upper()
                name = _clean_text(m_prev.group(2) or desig)
            else:
                desig = f"EBR-UNNAMED-{idx+1}"
                name = f"Area {idx+1}"

        # Determine airspace type
        if desig.startswith("EBP"):
            airspace_type = "PROHIBITED"
        elif desig.startswith("EBD"):
            airspace_type = "DANGER"
        elif "UAS" in desig or "UAS" in name:
            airspace_type = "UAS_ZONE"
        else:
            airspace_type = "RESTRICTED"

        # Data cells in row 1
        data_cells = [c.get_text(" ", strip=True) for c in rows[1].find_all(["td", "th"])]
        if not data_cells:
            continue

        raw_lateral = data_cells[0] if len(data_cells) > 0 else ""
        raw_vertical = data_cells[1] if len(data_cells) > 1 else "UNL / GND"
        raw_restriction = data_cells[2] if len(data_cells) > 2 else ""
        raw_schedule = data_cells[3] if len(data_cells) > 3 else "HX"

        upper, lower, v_ref = parse_vertical_limits(raw_vertical)

        # Parse schedule & temporal type
        sched_clean = _clean_text(raw_schedule)
        if "PERM" in sched_clean.upper():
            temporal_type = "PERMANENT"
        elif "NOTAM" in sched_clean.upper() or "HX" in sched_clean.upper():
            temporal_type = "ACTIVE_BY_NOTAM"
        else:
            temporal_type = "SCHEDULED"

        # Geometry validation
        lat_clean = _clean_text(raw_lateral)
        geometry = None
        val_status = "UNKNOWN"
        val_issues: list[str] = []

        # Check for circle
        cm = CIRCLE_RE.search(lat_clean)
        if cm and "arc" not in lat_clean.lower():
            rad_str = cm.group(1) or cm.group(2)
            lat_str = cm.group(3)
            lon_str = cm.group(4)
            try:
                rad_val = float(rad_str)
                c_lat = parse_lat(lat_str)
                c_lon = parse_lon(lon_str)

                if not (MIN_LAT <= c_lat <= MAX_LAT and MIN_LON <= c_lon <= MAX_LON):
                    val_status = "OUT_OF_RANGE"
                    msg = f"Circle center ({c_lat}, {c_lon}) out of national airspace bounds"
                    val_issues.append(msg)
                    issues.append(Issue("WARN", "AIRSPACE_OUT_OF_BOUNDS", "airspace", desig, section, msg))
                elif rad_val <= 0 or rad_val > 50:
                    val_status = "INVALID_GEOMETRY"
                    msg = f"Unrealistic circle radius: {rad_val} NM"
                    val_issues.append(msg)
                    issues.append(Issue("WARN", "AIRSPACE_INVALID_RADIUS", "airspace", desig, section, msg))
                else:
                    ring = generate_circle_polygon(c_lat, c_lon, rad_val, num_points=36)
                    geometry = {
                        "type": "Polygon",
                        "coordinates": [ring]
                    }
                    val_status = "VALID"
            except (CoordError, ValueError) as err:
                val_status = "INVALID_GEOMETRY"
                msg = f"Failed to parse circle coordinate: {err}"
                val_issues.append(msg)
                issues.append(Issue("WARN", "AIRSPACE_COORD_ERROR", "airspace", desig, section, msg))

        elif "border" in lat_clean.lower():
            val_status = "BORDER_UNRESOLVED"
            msg = "Boundary references international border; excluded from production geometry until surveyed border line is ingested"
            val_issues.append(msg)
            issues.append(Issue("WARN", "AIRSPACE_BORDER_EXCLUDED", "airspace", desig, section, f"{desig}: {msg}"))

        elif "arc" in lat_clean.lower():
            val_status = "ARC_UNRESOLVED"
            msg = "Boundary contains circular arc; excluded from production polygon until arc segmentation engine is active"
            val_issues.append(msg)
            issues.append(Issue("WARN", "AIRSPACE_ARC_EXCLUDED", "airspace", desig, section, f"{desig}: {msg}"))

        else:
            # Linear coordinate polygon
            matches = COORD_PAIR_RE.findall(lat_clean)
            if len(matches) >= 3:
                coords: list[list[float]] = []
                coords_valid = True
                for lat_s, lon_s in matches:
                    try:
                        p_lat = parse_lat(lat_s)
                        p_lon = parse_lon(lon_s)
                        if not (MIN_LAT <= p_lat <= MAX_LAT and MIN_LON <= p_lon <= MAX_LON):
                            coords_valid = False
                            msg = f"Vertex coordinate ({p_lat}, {p_lon}) out of bounds"
                            val_issues.append(msg)
                            issues.append(Issue("WARN", "AIRSPACE_OUT_OF_BOUNDS", "airspace", desig, section, f"{desig}: {msg}"))
                            break
                        coords.append([p_lon, p_lat])
                    except CoordError as err:
                        coords_valid = False
                        msg = f"Coordinate error {err}"
                        val_issues.append(msg)
                        issues.append(Issue("WARN", "AIRSPACE_COORD_ERROR", "airspace", desig, section, f"{desig}: {msg}"))
                        break

                if coords_valid and len(coords) >= 3:
                    # Ring closure
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    geometry = {
                        "type": "Polygon",
                        "coordinates": [coords]
                    }
                    val_status = "VALID"
                else:
                    val_status = "INVALID_GEOMETRY"
            else:
                val_status = "INSUFFICIENT_COORDINATES"
                msg = f"Boundary has only {len(matches)} coordinate fixes; minimum 3 required for polygon"
                val_issues.append(msg)
                issues.append(Issue("WARN", "AIRSPACE_INSUFFICIENT_POINTS", "airspace", desig, section, f"{desig}: {msg}"))

        airspaces.append({
            "id": f"EB-ENR51-{desig}",
            "designation": desig,
            "name": name,
            "airspace_type": airspace_type,
            "classification": None,
            "lower_limit": lower,
            "upper_limit": upper,
            "vertical_limit_reference": v_ref,
            "geometry": geometry,
            "boundary_text": lat_clean,
            "controlling_authority": _clean_text(raw_restriction),
            "activation_schedule": sched_clean,
            "temporal_type": temporal_type,
            "valid_from": None,
            "valid_until": None,
            "source": "skeyes Belgium & Luxembourg eAIP",
            "source_section": section,
            "source_file": source_file,
            "source_url": source_url or f"https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/{source_file}",
            "effective_date": effective_date,
            "retrieved_at": "2026-10-21T12:00:00Z",
            "parser_version": "0.2.0",
            "validation_status": val_status,
            "validation_issues": val_issues,
        })

    return airspaces, issues


def parse_enr_2_1(html: str, source_url: str = "", effective_date: str = "2026-10-01") -> tuple[list[dict[str, Any]], list[Issue]]:
    """Parse ENR 2.1 (FIR, UIR, TMA, CTA)."""
    section = "ENR 2.1"
    source_file = "EB-ENR-2.1-en-GB.html"
    airspaces: list[dict[str, Any]] = []
    issues: list[Issue] = []

    soup = BeautifulSoup(html, "lxml")
    tables = soup.find_all("table")

    for idx, table in enumerate(tables):
        rows = table.find_all("tr")
        if not rows:
            continue

        # Extract field values from table rows
        table_dict: dict[str, str] = {}
        for r in rows:
            cells = [c.get_text(" ", strip=True) for c in r.find_all(["td", "th"])]
            if len(cells) >= 2:
                key = _clean_text(cells[0])
                val = _clean_text(cells[1])
                if key and key not in table_dict:
                    table_dict[key] = val

        if "Lateral limits" not in table_dict:
            continue

        raw_lateral = table_dict.get("Lateral limits", "")
        raw_vertical = table_dict.get("Vertical limits", "UNL / GND")
        raw_class = table_dict.get("Airspace class", "C")
        raw_units = table_dict.get("Control units", table_dict.get("Units", "Brussels ACC"))
        raw_hours = table_dict.get("OPR HR", "H24")

        # Determine Airspace Designation & Name from preceding heading or title
        prev_node = table
        desig = None
        for _ in range(6):
            prev_node = prev_node.find_previous(["h4", "h5", "div", "p", "span"])
            if not prev_node:
                break
            txt = _clean_text(prev_node.get_text(" ", strip=True))
            if any(k in txt for k in ["TMA", "CTA", "FIR", "UIR", "UTA"]):
                # Extract clean title e.g. "Liège TMA One" or "Brussels LCTA" or "BRUSSELS UIR"
                m_title = re.search(r"((?:Brussels|Liège|Charleroi|Beauvechain|Kleine-Brogel|Antwerpen|Oostende)?\s*(?:FIR|UIR|UTA|CTA|TMA|CTR)\s*(?:[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)?)", txt, re.I)
                if m_title:
                    desig = m_title.group(1).strip()
                    break

        if not desig:
            desig = f"ENR21-AIRSPACE-{idx+1}"

        # Clean designation
        desig_clean = re.sub(r"^\d+(?:\.\d+)*\s*", "", desig).strip()
        name = desig_clean

        # Airspace Type
        upper_desig = desig_clean.upper()
        if "UIR" in upper_desig:
            airspace_type = "UIR"
        elif "FIR" in upper_desig:
            airspace_type = "FIR"
        elif "TMA" in upper_desig:
            airspace_type = "TMA"
        elif "CTA" in upper_desig or "UTA" in upper_desig:
            airspace_type = "CTA"
        elif "CTR" in upper_desig:
            airspace_type = "CTR"
        else:
            airspace_type = "CONTROLLED_AIRSPACE"

        upper, lower, v_ref = parse_vertical_limits(raw_vertical)

        # Geometry validation
        lat_clean = _clean_text(raw_lateral)
        geometry = None
        val_status = "UNKNOWN"
        val_issues: list[str] = []

        if "border" in lat_clean.lower():
            val_status = "BORDER_UNRESOLVED"
            msg = "Airspace lateral limits reference international border; excluded from production vector polygon until border spline is reconciled"
            val_issues.append(msg)
            issues.append(Issue("WARN", "AIRSPACE_BORDER_EXCLUDED", "airspace", desig_clean, section, f"{desig_clean}: {msg}"))

        elif "arc" in lat_clean.lower():
            val_status = "ARC_UNRESOLVED"
            msg = "Airspace lateral limits include circular arc segment; excluded from production polygon until arc segmentation engine is active"
            val_issues.append(msg)
            issues.append(Issue("WARN", "AIRSPACE_ARC_EXCLUDED", "airspace", desig_clean, section, f"{desig_clean}: {msg}"))

        else:
            matches = COORD_PAIR_RE.findall(lat_clean)
            if len(matches) >= 3:
                coords: list[list[float]] = []
                coords_valid = True
                for lat_s, lon_s in matches:
                    try:
                        p_lat = parse_lat(lat_s)
                        p_lon = parse_lon(lon_s)
                        if not (MIN_LAT <= p_lat <= MAX_LAT and MIN_LON <= p_lon <= MAX_LON):
                            coords_valid = False
                            msg = f"Vertex coordinate ({p_lat}, {p_lon}) out of bounds"
                            val_issues.append(msg)
                            issues.append(Issue("WARN", "AIRSPACE_OUT_OF_BOUNDS", "airspace", desig_clean, section, f"{desig_clean}: {msg}"))
                            break
                        coords.append([p_lon, p_lat])
                    except CoordError as err:
                        coords_valid = False
                        msg = f"Coordinate error {err}"
                        val_issues.append(msg)
                        issues.append(Issue("WARN", "AIRSPACE_COORD_ERROR", "airspace", desig_clean, section, f"{desig_clean}: {msg}"))
                        break

                if coords_valid and len(coords) >= 3:
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    geometry = {
                        "type": "Polygon",
                        "coordinates": [coords]
                    }
                    val_status = "VALID"
                else:
                    val_status = "INVALID_GEOMETRY"
            else:
                val_status = "INSUFFICIENT_COORDINATES"
                msg = f"Airspace lateral limits have {len(matches)} points; minimum 3 required for polygon"
                val_issues.append(msg)
                issues.append(Issue("WARN", "AIRSPACE_INSUFFICIENT_POINTS", "airspace", desig_clean, section, f"{desig_clean}: {msg}"))

        airspaces.append({
            "id": f"EB-ENR21-{re.sub(r'[^A-Za-z0-9]', '', desig_clean)}-{idx+1}",
            "designation": desig_clean,
            "name": name,
            "airspace_type": airspace_type,
            "classification": re.sub(r"\(\d+\)", "", raw_class).strip(),
            "lower_limit": lower,
            "upper_limit": upper,
            "vertical_limit_reference": v_ref,
            "geometry": geometry,
            "boundary_text": lat_clean,
            "controlling_authority": raw_units,
            "activation_schedule": raw_hours,
            "temporal_type": "PERMANENT",
            "valid_from": None,
            "valid_until": None,
            "source": "skeyes Belgium & Luxembourg eAIP",
            "source_section": section,
            "source_file": source_file,
            "source_url": source_url or f"https://ops.skeyes.be/html/belgocontrol_static/eaip/eAIP_Main/html/eAIP/{source_file}",
            "effective_date": effective_date,
            "retrieved_at": "2026-10-21T12:00:00Z",
            "parser_version": "0.2.0",
            "validation_status": val_status,
            "validation_issues": val_issues,
        })

    return airspaces, issues
