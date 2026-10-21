# CopilOPS AIP — Aeronautical Data Platform

> **Author:** Mohd Faraz — [faraazz05.github.io](https://faraazz05.github.io)  
> **Source Repository:** [github.com/faraazz05/copilops-aip](https://github.com/faraazz05/copilops-aip)  
> **Live Demo (GitHub Pages):** [faraazz05.github.io/copilops-aip](https://faraazz05.github.io/copilops-aip)

An end-to-end, scalable aeronautical data platform built for flight dispatchers and operations controllers (OCC). Ingests, validates, and models official aeronautical information from the **Belgium & Luxembourg eAIP** published by [skeyes](https://www.skeyes.be), exposes a typed **Node.js / Express & MongoDB/Mongoose API**, and renders an interactive **React + TypeScript operational geospatial application**.

---

## Architecture Overview

```
   [ Official skeyes eAIP HTML ]
                │
                ▼
  ┌───────────────────────────┐
  │  Python Extraction Engine │ ◄── Pure functions (lxml/BeautifulSoup)
  │  (coords.py, parse_ad,    │     Strict coordinate parsing & validation
  │   parse_routes, diff.py)  │     Provenance tracking in SQLite
  └─────────────┬─────────────┘
                │
                ▼ (Export via scripts/export_data.py)
  ┌───────────────────────────┐
  │  Node.js / Express API    │ ◄── TypeScript + Mongoose / MongoDB
  │  (server/src/models/...)  │     REST endpoints for airports, routes, navaids
  └─────────────┬─────────────┘
                │
        ┌───────┴────────────────────────┐
        ▼                                ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│  React + TypeScript SPA   │  │  Multi-Stage Dockerfile   │
│  (Vite, Leaflet, Tailwind)│  │  Deploy to Render/Vercel  │
│  Interactive Map, Cockpit │  │  (Zero local lock-in)     │
└───────────────────────────┘  └───────────────────────────┘
```

### Technology Stack Justification (Addressing Technical Assessment Specification)

* **Python (Extraction, Parsing, Math & AIRAC Diff):**
  Python offers native advantages for complex HTML/XML DOM extraction with `lxml`/`BeautifulSoup`, deterministic coordinate trigonometry, and AIRAC cycle diff calculation.
* **Node.js, Express & TypeScript (Backend API & Domain Services):**
  Matches CopilOPS's production stack. Provides strongly-typed domain interfaces, asynchronous throughput, and clean RESTful endpoints.
* **MongoDB & Mongoose (Document Data Model):**
  Hierarchical aeronautical data (airports containing runway arrays, operating hours, navigation sub-aids, and route sequences) maps naturally to document schemas without rigid table migrations.
* **React, TypeScript & Leaflet (Geospatial Cockpit):**
  Delivers an interactive, high-performance operational dispatcher UI with toggleable map layers, declared distance tables, and AIRAC cycle comparison tools.
* **Docker & Docker Compose:**
  Multi-stage container packaging for portable deployment to free hosting (Render, Railway, Fly.io).

---

## Quick Start

### 1. Run the Python Extraction Engine (Optional - data already exported)
```bash
# Activate venv & install python dependencies
.\.aip\Scripts\activate          # Windows
pip install -r requirements.txt

# Run full pipeline (Waypoints, Navaids, Routes, and 53 Aerodromes)
python run_pipeline.py --html-dir "data/raw/2026-10-01/eAIP_Package_10-2026/eAIP_Main/html/eAIP" --effective 2026-10-01

# Run 75 Python unit tests
pytest
```

### 2. Run the Node.js / Express TypeScript API
```bash
cd server
npm install
npm run build
npm start

# Run API test suite (Jest + Supertest)
npm test
```
*API will be live at `http://localhost:5000/api/health`*

### 3. Run the React + TypeScript Frontend
```bash
cd client
npm install
npm run dev
```
*Open `http://localhost:3000` to access the interactive platform.*

---

## Key Features & Assessment Deliverables

### 1. Interactive Operations Map
* Built with React + Leaflet.
* **Selectable Layers:**
  * **Primary Target Airports:** EBBR (Brussels), EBLG (Liège), and EBCI (Charleroi) highlighted with custom badges.
  * **All Belgian Aerodromes:** 33 active airports with clickable operational popups.
  * **Belgian ATS Airways / Routes:** 51 RNAV routes (L607, L179, etc.) rendered as geodesic flight paths.
  * **Radio Navaids:** VOR, DVOR, DME, NDB, and ILS components.
  * **Waypoints:** 303 reporting points with decimal coordinates.

### 2. Airport Operational Cockpit (Flight Dispatcher / OCC)
* CLI tool: `python show_airport.py EBBR` (or `python show_airport.py --all`).
* Web dashboard: Dedicated view for EBBR, EBLG, EBCI displaying:
  * Elevation, magnetic variation, geoid undulation, operator.
  * **Runway Physical Characteristics & Declared Distances:** RWY designator, true bearing, dimensions, surface, PCN/PCR strength, TORA, TODA, ASDA, LDA, THR elevation.
  * **Operating Hours:** Operator, ATS/Tower, Customs & Immigration, AIS Briefing Office.
  * **Rescue & Fire Fighting Services (RFFS):** Category 10 (EBBR/EBLG), CAT 7–9 (EBCI).
  * **Radio Navigation & Landing Aids:** ILS CAT I/II/III equipment, DMEs, marker beacons.

### 3. AIRAC Lifecycle Management & Change Detection
* CLI tool: `python run_diff.py --from 2026-09-04 --to 2026-10-01`.
* Audits every aeronautical record across cycles and flags:
  * `NEW`: Freshly introduced runways, routes, or facilities.
  * `MODIFIED`: Alterations (e.g. runway shortened, declared distances adjusted, frequency changed).
  * `DELETED`: Decommissioned facilities.
  * `UNCHANGED`: Stable data.
* Does not overwrite past editions; preserves historical provenance.

### 4. Data Quality & AIP Ambiguities Handling
Documented in detail in [DATA_ISSUES.md](file:///c:/Users/spfar/Desktop/copilops-aip/DATA_ISSUES.md):
1. **Missing Hemisphere on Coordinates:** Caught EBCI RWY 24 end coordinate published without 'N'; auto-resolved and logged.
2. **Duplicate Marker Beacon IDs:** Handled collision of `"dash / dash"` and `"dot / dash"` identifiers across multiple runways.
3. **Unicode Glyph Dimensions:** Handled non-standard multiplication sign `×` in EBTN dimensions.
4. **Thin & Narrow Non-Breaking Spaces:** Normalized typography whitespace in declared distances.

---

## Production Deployment & Docker

See [AUTOMATION.md](AUTOMATION.md) for detailed cloud configuration, environment variables, and the 28-day AIRAC automation lifecycle.

### Build and Run with Docker (Optional)
```bash
# Build multi-stage Docker image and start with MongoDB
docker-compose up --build
```

### Free Cloud Deployment Options:
* **Option 1 (GitHub Pages & Actions - Direct Portfolio Link):** Built directly into the repository root (`index.html`, `assets/`) and automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). When pushed to GitHub, it is immediately accessible at `https://faraazz05.github.io/copilops-aip/`.
* **Option 2 (Full-Stack Container):** **Render.com + MongoDB Atlas** (Uses the multi-stage [Dockerfile](Dockerfile) and [render.yaml](render.yaml) for 1-click full API + UI hosting).

---

## Automated Test Coverage

* **Python Pipeline Tests:** 75 passed / 75 total (`pytest`)
  * `tests/test_coords.py`: High-precision latitude/longitude conversion and out-of-range rejection.
  * `tests/test_parse_ad.py`: AD 2.2, 2.3, 2.6, 2.12 (rowspan state machine), 2.13, 2.18, 2.19, and real-data smoke tests for EBBR, EBLG, EBCI.
  * `tests/test_parse_enr.py`: Waypoints and radio navaids.
  * `tests/test_parse_routes.py`: ATS routes and airway segments.
  * `tests/test_diff.py`: AIRAC change detection engine.
* **Node.js API Tests:** 7 passed / 7 total (`npm test` in `server/`)
  * Healthcheck endpoint, airport list, operational view for EBBR, ATS routes, navaids, AIRAC changes, and AIP validation issues.
