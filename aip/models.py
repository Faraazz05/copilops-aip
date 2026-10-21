"""Plain data containers shared by parsers, validators and the database.

Author: Mohd Faraz (https://faraazz05.github.io)
CopilOPS Aeronautical Data Platform
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PARSER_VERSION = "0.1.0"
SOURCE_NAME = "Belgium & Luxembourg eAIP (skeyes)"


@dataclass
class Fact:
    """One extracted value. Every fact carries its own provenance fields."""
    entity_type: str      # waypoint, navaid, runway, ...
    entity_key: str       # natural key, e.g. "ABBUW" or "EBBR/25L"
    field: str            # latitude, lda, frequency_value, ...
    value: object         # str | int | float | None
    unit: str | None      # deg, M, FT, MHZ, ...
    raw_text: str         # exactly what the AIP said
    section: str          # "ENR 4.4", "EBBR AD 2.12", ...


@dataclass
class Issue:
    """A data-quality problem. Never swallowed, always stored."""
    severity: str         # ERROR or WARN
    code: str             # COORD_PARSE, STRUCTURE_HEADER_CHANGED, ...
    entity_type: str
    entity_key: str
    section: str
    message: str


@dataclass
class SourceContext:
    html_dir: Path        # folder holding the eAIP html files
    effective_date: str   # YYYY-MM-DD of the AIRAC cycle
    retrieved_at: str     # ISO timestamp, UTC
    url_base: str         # public URL of the same folder
