# CopilOPS AIP — Aeronautical Data Platform

> **Author:** Mohd Faraz — [faraazz05.github.io](https://faraazz05.github.io)  
> **Source Repository:** [github.com/faraazz05/copilops-aip](https://github.com/faraazz05/copilops-aip)  
> **Live Operational Application (GitHub Pages):** [faraazz05.github.io/copilops-aip](https://faraazz05.github.io/copilops-aip)

An end-to-end, high-integrity aeronautical data engineering platform and geospatial cockpit built for flight dispatchers and operations controllers (OCC). Ingests, validates, and models official aeronautical information from the **Belgium & Luxembourg eAIP** published by [skeyes](https://www.skeyes.be), exposes a typed **Node.js / Express & MongoDB/Mongoose API**, and renders an interactive **React + TypeScript operational geospatial application**.

---

## Architecture & Authoritative Data Flow

```
   [ Official skeyes eAIP HTML (ENR & AD Sections) ]
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │          Python Extraction Engine            │ ◄── Pure deterministic parsers (lxml/BeautifulSoup)
   │  - coords.py (WGS84 DDMMSSh to Decimal Deg)  │     Deterministic geometry generation (spherical rhumb)
   │  - parse_airspace.py (ENR 2.1 & ENR 5.1)     │     Exclusion of unmodeled borders & arcs (no guesswork)
   │  - parse_ad.py (AD 2.1 - 2.19)               │     Provenance tracking in SQLite EAV schema
   │  - parse_routes.py, diff.py, operational.py  │     Non-swallowed Issue logging
   └──────────────────────┬───────────────────────┘
                          │
                          ▼ (Export via scripts/export_data.py)
   ┌──────────────────────────────────────────────┐
   │         Node.js / Express TypeScript API     │ ◄── Strongly-typed REST endpoints (/api/airports,
   │         (server/src/models & routes)         │     /api/routes, /api/airspaces, /api/issues...)
   └──────────────────────┬───────────────────────┘
                          │
         ┌────────────────┴───────────────────────────────┐
         ▼                                                ▼
 ┌───────────────────────────────┐        ┌───────────────────────────────┐
 │   React + TypeScript Cockpit  │        │    Multi-Stage Dockerfile     │
 │   - Quiet CartoDB Positron Map│        │    Deploy to Render / Cloud   │
 │   - Decluttered Default View  │        │    (Zero local lock-in)       │
 │   - Single Airway Highlight   │        └───────────────────────────────┘
 │   - Airspace & SUAS Polygons  │
 │   - Reusable Provenance Card  │
 │   - Zero Fake Aviation Defaults│
 └───────────────────────────────┘
```

---

## Supported Source Publication & AIRAC Lifecycle

* **Official Data Authority:** skeyes (Civil Aviation Authority of Belgium & Luxembourg).
* **Active Publication Edition:** `AIRAC AMDT 010/2026`.
* **Effective Date:** `2026-10-01` (Publication date: `2026-09-17`).
* **Prior 28-Day Cycle:** `2026-09-03` (AMDT 009/2026).
* **Next 28-Day Cycle:** `2026-10-29` (AIRAC AMDT 011/2026).
* **Cycle Interval:** Strictly calculated 28 days programmatically.
* **AIRAC Comparison Transparency:** The active edition (`2026-10-01`) is fully extracted and validated from local official HTML snapshots. Prior cycle (`2026-09-03`) baseline records are provided for demonstration and clearly labeled as baseline comparisons, preventing false claims of unverified official comparisons.
* **Integrity Guard:** Unsafe promotion of incomplete editions is blocked by validation thresholds before exporting to the serving layer.

---

## Key Features & Upgrades

### 1. Decluttered Operations Map & Quiet Neutral Basemap
* **Quieter Geographic Basemap:** Switched from busy OpenStreetMap default to **CartoDB Positron** (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) with clear attribution, high contrast against vector aeronautical geometries, and an in-app layer toggle fallback. A visible disclaimer confirms that the basemap is for general geographic context only and does not constitute certified aeronautical charting.
* **Default Map State (Clutter Elimination):**
  * **Primary Target Airports (EBBR, EBLG, EBCI):** Prominently displayed with distinct badges.
  * **Secondary Aerodromes:** OFF by default (toggleable).
  * **Full ATS Route Network:** OFF by default (prevents criss-crossing route clutter).
  * **Radio Navaids & Waypoints:** OFF by default (toggleable, with hover tooltips instead of permanent tooltips).
  * **Controlled Airspace (CTA/TMA):** Available as readable, translucent polygons.
* **Single-Airway Selection & Highlighting:**
  * Dedicated route selector dropdown with real-time airway search.
  * Selecting an airway highlights only its verified segment sequence and connected waypoint fixes while keeping unrelated routes hidden or dimmed.
  * Explicit operational disclaimer: Polyline geometry is reconstructed from published sequential fixes (ENR 3.2 / ENR 4.4); it does not represent an officially surveyed route centerline.
* **Navigation & Framing:**
  * One-click "Fit Target Airports", "Fit Selected Feature", and "Reset Overview" actions.
  * Responsive layout with automatic Leaflet resize invalidation on container changes.
  * Floating panels positioned with proper padding so markers are never hidden behind UI controls.

### 2. Airspace and Special-Use Airspace (ENR 2.1 & ENR 5.1)
* **Deterministic Boundary Extraction:**
  * Parsed from official `EB-ENR-2.1-en-GB.html` (CTA, TMA, UIR) and `EB-ENR-5.1-en-GB.html` (Restricted EBR, Danger EBD, UAS zones).
  * **130 Airspace Sectors Extracted**, including **63 verified GeoJSON polygons** directly rendered on the map.
  * **Circular Geometry Engine:** Exact great-circle destination trigonometry generates 36-vertex closed polygon rings for circular airspace (e.g., Royal Estate of Ciergnon EBR02, Diest EBR03).
  * **Unmodeled Boundary Protection:** In accordance with strict geospatial standards, boundaries that reference unmodeled international borders (`along the Belgian-Dutch border`) or complex circular arcs are **never closed with guessed vertices or approximate lines**. They are logged as explicit issues (`BORDER_UNRESOLVED`, `ARC_UNRESOLVED`), retained as verified text records, and accessible in the **Airspace Verification Log**.

### 3. Field-Level Provenance & Data Integrity
* **Traceable Lineage:** Every extracted aeronautical fact tracks:
  * Official published value and unit (`FT`, `M`, `deg`, `MHZ`).
  * Raw source text exactly as published in the eAIP table cell.
  * Specific AIP section (e.g. `EBBR AD 2.2 § 3`, `EBCI AD 2.12`, `ENR 4.1`).
  * Source snapshot file and direct clickable link to the official skeyes eAIP URL.
  * AIRAC effective date (`2026-10-01`) and parser version.
  * Validation status (`VALID`, `PUBLISHED`, `RECONSTRUCTED_FROM_FIXES`, `BORDER_UNRESOLVED`).
* **Reusable Provenance Card:** Consistent metadata inspector rendered on the map and airport cockpit when any feature or metric is selected.

### 4. Removal of Misleading Aviation Fallbacks
* **Elimination of Fabricated Defaults:**
  * Removed false `"CAT 10"` defaults: If Rescue & Fire Fighting is not published (AD 2.6), it is displayed honestly as "Not published in AD 2.6" instead of substituting CAT 10.
  * Removed false `"ASPH"` defaults: If runway surface is unpaved or not published (AD 2.12), it is labeled "Unpaved / Not published" rather than inventing asphalt.
  * Removed false `"H24"` defaults: Operating hours for operators, tower, customs, and AIS explicitly distinguish published schedules from unextracted/unpublished values.
  * Corrected **Airport Name vs. Operator Confusion**: EBBR displays its authentic published AD 2.1 name (`BRUSSELS / Brussels-National`) and its AD 2.2 operator (`Brussels Airport Company N.V./S.A.`). Same for EBLG (`LIÈGE / Liège` / `Liège Airport S.A.`) and EBCI (`CHARLEROI / Brussels South` / `Brussels South Charleroi Airport S.A.`).

### 5. Separation of Real Anomalies from Curated Examples
* **Two Clearly Labeled Views in Data Quality Inspector:**
  1. **Detected by Latest Pipeline Run:** 137 real, persisted diagnostic issues from the extraction pipeline and geometry validator for edition `2026-10-01`, with severity filters, issue code selectors, and section links.
  2. **Documented Examples / Historical Edge Cases:** The 7 curated educational edge-case case studies (missing hemisphere in EBCI, duplicate audio IDs, Unicode thin spaces, etc.), explicitly marked as reference case studies rather than live detections.

---

## Quick Start & Verification

### 1. Run the Python Extraction Engine & Tests
```bash
# Activate virtual environment
.\.aip\Scripts\activate          # Windows PowerShell / CMD

# Run full pipeline (Waypoints, Navaids, Routes, Aerodromes, Airspaces)
python run_pipeline.py --html-dir "data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP" --effective 2026-10-01

# Run export to generate server/data/aeronautical_data.json
python scripts/export_data.py

# Run complete Python test suite (84 automated tests)
python -m pytest
```

### 2. Run the Node.js / Express TypeScript API
```bash
cd server
npm.cmd install
npm.cmd run build
npm.cmd test      # 8 passed / 8 total
npm.cmd start
```
*API will be live at `http://localhost:5000/api/health`*

### 3. Run the React + TypeScript Frontend
```bash
cd client
npm.cmd install
npm.cmd run build   # Type-check with tsc & Vite bundle production
npm.cmd run dev     # Start local Vite dev server
```
*Open `http://localhost:3000` (or `http://localhost:5173`) to access the interactive platform.*

---

## Automated Test Coverage Summary

* **Python Pipeline Tests:** **84 passed / 84 total** (`pytest`)
  * `tests/test_coords.py` (14 tests): WGS84 coordinate parsing, range bounds, hemisphere handling.
  * `tests/test_parse_ad.py` (52 tests): AD 2.1 names, 2.2 ARP, 2.3 hours, 2.6 RFFS, 2.12 runways, 2.13 declared distances, 2.18 comms, 2.19 ILS, real-data smoke tests for EBBR, EBLG, EBCI.
  * `tests/test_parse_airspace.py` (9 tests): Circle polygon generation (36 vertices), vertical limit parsing, linear polygon ring closure, arc/border exclusion issue tracking, out-of-bounds rejection, real ENR 2.1/5.1 smoke tests.
  * `tests/test_parse_enr.py` (3 tests): Waypoints and radio navigation aids.
  * `tests/test_parse_routes.py` (2 tests): ATS upper routes, RNAV specifications, airway segments.
  * `tests/test_diff.py` (4 tests): AIRAC cycle comparison engine (NEW, MODIFIED, DELETED, UNCHANGED).
* **Node.js API Tests:** **8 passed / 8 total** (`server/tests/api.test.ts` via Jest + Supertest)
  * `/api/health`, `/api/airports`, `/api/airports/EBBR`, `/api/routes`, `/api/navaids`, `/api/airspaces`, `/api/changes`, `/api/issues`.
* **Frontend TypeScript Compilation:** Passed with 0 errors (`tsc && vite build`).

---

## Known Limitations & Future Work

1. **National Border Spline Ingestion:** Airspace geometries that define lateral limits as `along the Belgian-Dutch border` or `along the Belgian-French border` are currently excluded from polygon generation and logged as `BORDER_UNRESOLVED`. Future work will ingest official boundary splines from the National Geographic Institute of Belgium (IGN) to resolve these boundaries deterministically.
2. **Prior Edition Raw Snapshot:** The raw archive currently contains the complete package for `2026-10-01` (`eAIP_Package_10-2026`). Ingesting historical raw packages (e.g. `2026-09-03`) into SQLite will enable live, multi-cycle diff verification.
3. **NOTAM Ingestion Separation:** In accordance with the system boundary specification, real-time NOTAM parsing remains decoupled from the static 28-day eAIP publication pipeline.
