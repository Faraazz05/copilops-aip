"""Convert AIP coordinates (DDMMSSN / DDDMMSSE) to decimal degrees.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform
"""
from __future__ import annotations

import re


class CoordError(ValueError):
    pass


_LAT = re.compile(r"^(\d{2})(\d{2})(\d{2}(?:\.\d+)?)([NS])$")
_LON = re.compile(r"^(\d{3})(\d{2})(\d{2}(?:\.\d+)?)([EW])$")


def _clean(text: str) -> str:
    return re.sub(r"\s+", "", text or "").upper()


def _to_decimal(match, negative_hemi: str, max_deg: int, label: str, text: str) -> float:
    deg, minute, sec, hemi = match.groups()
    deg, minute, sec = int(deg), int(minute), float(sec)
    if minute >= 60 or sec >= 60:
        raise CoordError(f"{label} {text!r}: minutes/seconds out of range")
    value = deg + minute / 60 + sec / 3600
    if value > max_deg:
        raise CoordError(f"{label} {text!r}: more than {max_deg} degrees")
    return round(-value if hemi == negative_hemi else value, 6)


def parse_lat(text: str) -> float:
    t = _clean(text)
    m = _LAT.match(t)
    if not m:
        raise CoordError(f"latitude {text!r} does not match DDMMSS[.ss]N/S")
    return _to_decimal(m, "S", 90, "latitude", text)


def parse_lon(text: str) -> float:
    t = _clean(text)
    m = _LON.match(t)
    if not m:
        raise CoordError(f"longitude {text!r} does not match DDDMMSS[.ss]E/W")
    return _to_decimal(m, "W", 180, "longitude", text)
