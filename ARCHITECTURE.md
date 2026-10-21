# CopilOPS AIP — System Architecture & Engineering Report

**Author:** Aeronautical Data Engineer Candidate  
**Project:** Belgium & Luxembourg eAIP Data Pipeline (`copilops-aip`)  
**Authority Source:** skeyes official eAIP (https://ops.skeyes.be)  
**AIRAC Cycle Target:** 2026-10-01 (and multi-cycle lifecycle management)

---

## 1. System Overview & Core Philosophy

Operational aviation decision-support systems (flight dispatch, OCC, route optimization) require data that is **deterministic, traceable, and resilient to change**. Commercial databases often obscure the origin and lineage of aeronautical values. 

The `copilops-aip` system implements an end-to-end data pipeline adhering to three non-negotiable principles:
1. **Unbroken Provenance:** Every single extracted value (`Fact`) retains its exact source file, section, URL, retrieval timestamp, AIRAC cycle, and parser version.
2. **Never Swallow Faults:** Data quality anomalies (corrupted coordinates, restructured tables, omitted hemisphere tags) are never silently ignored or patched without a trace. They are captured as first-class `Issue` records.
3. **Change-Aware Lifecycle:** Aviation databases must not simply overwrite records every 28 days. The pipeline computes granular diffs (`NEW`, `MODIFIED`, `DELETED`, `UNCHANGED`) between consecutive AIRAC cycles.

---

## 2. Architecture & Data Flow

```
   [ Official skeyes eAIP HTML ]
                │
                ▼
      ┌──────────────────┐
      │  HTML Parsers    │ ◄── Pure functions, never raise on bad data
      │ (ENR 4.1/4.4/3.2 │     Yield (facts, issues) tuples
      │  AD 2.2/2.12/...)│
      └─────────┬────────┘
                │
                ▼
      ┌──────────────────┐
      │ Validation Layer │ ◄── Strict regex, decimal conversion,
      │ (coords.py, etc.)│     Unit tagging, range validation
      └─────────┬────────┘
                │
                ▼
      ┌──────────────────┐
      │ Database Layer   │ ◄── SQLite: editions, entities, facts, issues
      │ (db.py)          │     Natural key integrity & cycle isolation
      └─────────┬────────┘
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
┌───────────────┐              ┌──────────────────┐
│  AIRAC Diff   │              │ Operational View │
│  (diff.py)    │              │ & Interactive    │
│  NEW/MOD/DEL  │              │ Leaflet/Folium   │
└───────────────┘              │ HTML Map         │
                               └──────────────────┘
```

### 2.1 Storage & Schema Design

Rather than wide, sparse relational tables that break whenever the AIP publisher adds or modifies a column, the core engine uses an EAV-with-provenance model:
- `editions`: Tracks the AIRAC cycle (`effective_date`, `source`, `retrieved_at`, `parser_version`).
- `entities`: Registry of distinct aeronautical objects (`aerodrome`, `runway`, `waypoint`, `navaid`, `route`, `route_segment`).
- `facts`: Every field value is an immutable row with columns: `(edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version)`.
- `issues`: Explicit log of anomalies: `(edition, severity, code, entity_type, entity_key, section, message)`.
- `changes`: AIRAC transition audit trail: `(from_edition, to_edition, status, entity_type, entity_key, field, old_value, new_value, unit, section)`.

---

## 3. Data Parsers & Extraction Strategy

| Domain | Section | Extracted Aeronautical Elements |
|--------|---------|---------------------------------|
| **Airports** | AD 2.2 | ARP coordinates, elevation, reference temperature, magnetic variation, operator, geoid undulation |
| **Hours** | AD 2.3 | Operating hours for Operator, ATS, Customs, AIS, Fuel, Handling |
| **Safety** | AD 2.6 | Rescue & Fire Fighting Category (CAT 1–10) |
| **Runways** | AD 2.12 | Designators, true bearings, dimensions (L×W), surface type, PCR/PCN strength, THR/TDZ coordinates & elevations, geoid undulation |
| **Distances** | AD 2.13 | TORA, TODA, ASDA, LDA declared distances and operational runway remarks |
| **Comms** | AD 2.18 | ATS frequencies (TWR, APP, ATIS, GND, RADAR) |
| **Nav Aids** | AD 2.19 & ENR 4.1 | DVOR, DME, NDB, ILS (Localizer, Glide Path, Collocated DME, Marker Beacons) |
| **Waypoints**| ENR 4.4 | 5-letter significant points, exact coordinates, associated ATS routes |
| **Airways** | ENR 3.2 | RNAV ATS routes, navigation specifications (RNAV 5, RNAV 1), waypoint sequence, segment distances, and lower/upper limits |

### 3.1 Handling Complex Layouts (Rowspan State Machine)
AD 2.12 (Runway Physical Characteristics) uses an HTML `rowspan=3` layout where a single runway occupies three table rows with merged cells:
- Row 1: Designator, bearing, dimensions, surface/strength, THR coordinates, THR/TDZ elevation.
- Row 2: RWY opposite end coordinates (single cell).
- Row 3: THR geoid undulation (single cell).

The parser employs a structured state machine with cell-count lookahead that correctly groups related cells into a unified runway record without losing end coordinates or geoid undulation.

---

## 4. AIRAC Update & Automated Change-Detection Strategy

Aeronautical information is governed by the ICAO 28-day AIRAC cycle. Simply dropping and recreating the database every cycle destroys operational awareness.

### Automated Lifecycle Workflow:
1. **Detection:** Daily scheduled probe checks skeyes portal for upcoming publication package (e.g. `eAIP_Next`).
2. **Ingestion & Staging:** Ingest the new package into `facts` tagged with the new `effective_date`.
3. **Automated Diff Engine (`aip/diff.py`):**
   - Loads facts for Cycle $T$ and Cycle $T+1$.
   - Compares key tuple `(entity_type, entity_key, field)`:
     - In $T+1$ only $\rightarrow$ `NEW`
     - In $T$ only $\rightarrow$ `DELETED`
     - In both with value change $\rightarrow$ `MODIFIED`
     - In both with identical value $\rightarrow$ `UNCHANGED`
4. **Safety Verification:** High-consequence modifications (e.g. runway shortened, declared distance changed, navaid decommissioned) trigger automated threshold alerts for dispatcher review.
5. **Promotion:** Once verified, the new cycle is marked active for operational dispatch queries.

---

## 5. Temporary Information Architecture (AIP Supps & NOTAMs)

A primary challenge in aeronautical data engineering is managing conflicting temporal layers:
1. **Permanent Data (AIP):** Baseline data valid across 28-day AIRAC cycles.
2. **Medium-Term Data (AIP Supplements / SUP):** Published for works or temporary airspace changes lasting 2 months or more.
3. **Short-Term Tactical Data (NOTAMs):** Real-time operational changes (runway closures, unserviceable navaids, temporary obstacles).

### Proposed Multi-Layer Storage Architecture:
To prevent contaminating baseline AIP facts with ephemeral data while allowing real-time operational evaluation, we use a **layered override model**:

```
[ Baseline AIP Facts ]  <── Base Layer (Permanent)
         │
         ▼ (Overlaid with)
[ AIP Supplements ]     <── Temporal Layer (Effective Range [T_start, T_end])
         │
         ▼ (Overlaid with)
[ Active NOTAMs ]       <── Tactical Delta Layer (Parsed from NOTAM Q-code)
         │
         ▼
[ Effective Operational State at Flight Time T ]
```

When an operational user queries `EBBR/25L LDA` for departure time $T_0$:
1. Engine fetches base AIP value (3210 M).
2. Engine checks active SUPs covering $T_0$.
3. Engine checks active NOTAMs modifying EBBR/25L.
4. Returns effective operational value with explicit provenance banner (e.g. `LDA: 2800 M (Temporarily reduced via NOTAM A1234/26)`).

---

## 6. Data Quality & Error Handling Approach

The pipeline strictly validates all incoming values:
- **Strict Coordinate Parsing:** `aip/coords.py` validates degrees, minutes (<60), seconds (<60), and hemisphere letters. Any anomaly raises `CoordError` and creates an `Issue`.
- **Publisher Typo Detection:** Identifies publisher typos (e.g. missing 'N' hemisphere letter on EBCI runway 24 end coordinate) and logs a `MISSING_HEMISPHERE` warning.
- **Structural Anomaly Detection:** Missing tables, altered headers, or missing sections trigger `STRUCTURE_CHANGED` issues rather than runtime crashes.

---

## 7. Deliverables & Verification Summary

1. **Source Code:** Modular, tested Python package under `aip/` and root CLI scripts.
2. **Database:** SQLite database `data/aip.db` storing 33+ aerodromes, 96+ runways, 77+ navaids, 303 waypoints, 51 ATS routes, and complete issues.
3. **Interactive Map:** `analysis/aerodrome_map.html` providing visual layers for airports, navaids, waypoints, and ATS airway networks.
4. **Operational View:** `show_airport.py` offering immediate dispatch summaries for EBBR, EBLG, and EBCI.
5. **AIRAC Diff Engine:** `run_diff.py` and `aip/diff.py` providing audited cycle comparisons.
6. **Test Suite:** Over 55 automated unit tests with 100% pass rate.
