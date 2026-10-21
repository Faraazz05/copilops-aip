# CopilOPS AIP — System Architecture & Engineering Report

**Author:** Mohd Faraz — [faraazz05.github.io](https://faraazz05.github.io)  
**Project:** Belgium & Luxembourg eAIP Data Pipeline (`copilops-aip`)  
**Authority Source:** skeyes official eAIP (https://ops.skeyes.be)  
**AIRAC Cycle Target:** 2026-10-01 (and multi-cycle lifecycle management)

---

## 1. System Overview & Core Philosophy

Operational aviation decision-support systems (flight dispatch, OCC, route optimization) require data that is **deterministic, traceable, and resilient to change**. Commercial databases often obscure the origin and lineage of aeronautical values or substitute synthetic defaults when data is missing.

The `copilops-aip` platform adheres to five foundational engineering principles:

1. **Unbroken Provenance:** Every single extracted fact retains its exact source file, section, URL, retrieval timestamp, AIRAC cycle, and parser version.
2. **Never Fabricate Values:** If an official publication omits a field (e.g., Rescue and Fire Fighting category in AD 2.6, or operating hours in AD 2.3), the system never substitutes synthetic fallbacks such as `CAT 10` or `H24`. Missing data is honestly labeled as `NOT_PUBLISHED`.
3. **No Guessed Geometries:** Airspace boundaries that follow unmodeled international borders or circular arcs are never closed with guessed lines or approximate polygons. They are preserved in raw text and tracked as structured issues.
4. **Never Swallow Faults:** Anomalies (corrupted coordinates, restructured tables, omitted hemisphere tags) are captured as first-class `Issue` records.
5. **Change-Aware Lifecycle:** Diffs (`NEW`, `MODIFIED`, `DELETED`, `UNCHANGED`) between consecutive AIRAC cycles are calculated programmatically across a strict 28-day interval.

---

## 2. Architecture & Data Flow

```
   [ Official skeyes eAIP HTML (ENR & AD Sections) ]
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │          Python Extraction Engine            │
   │  - coords.py (WGS84 DDMMSSh to Decimal Deg)  │
   │  - parse_airspace.py (ENR 2.1 & ENR 5.1)     │
   │  - parse_ad.py (AD 2.1 - 2.19)               │
   │  - parse_routes.py, diff.py, operational.py  │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │              SQLite Database                 │
   │  - editions, entities, facts, issues, changes│
   └──────────────────────┬───────────────────────┘
                          │
                          ▼ (scripts/export_data.py)
   ┌──────────────────────────────────────────────┐
   │         Node.js / Express TypeScript API     │
   │  - /api/airports, /api/routes, /api/navaids  │
   │  - /api/airspaces, /api/changes, /api/issues │
   └──────────────────────┬───────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────┐
   │          React + TypeScript Frontend         │
   │  - Operations Map (CartoDB Positron Basemap) │
   │  - Airport Operational Cockpit (OCC / Disp)  │
   │  - Single-Route Highlighting & Disclaimers   │
   │  - Airspace Vector Polygons & SUAS Inspector │
   │  - Field-Level Provenance Viewer             │
   └──────────────────────────────────────────────┘
```

### 2.1 Storage & Schema Design

The core engine uses an EAV-with-provenance model in SQLite (`data/aip.db`):
- `editions`: Tracks the AIRAC cycle (`effective_date`, `source`, `retrieved_at`, `parser_version`).
- `entities`: Registry of distinct aeronautical objects (`aerodrome`, `runway`, `waypoint`, `navaid`, `route`, `route_segment`, `airspace`).
- `facts`: Every field value is an immutable row with columns: `(edition, entity_type, entity_key, field, value, value_type, unit, raw_text, source, section, source_url, source_file, effective_date, retrieved_at, parser_version)`.
- `issues`: Explicit log of anomalies: `(edition, severity, code, entity_type, entity_key, section, message)`.
- `changes`: AIRAC transition audit trail: `(from_edition, to_edition, status, entity_type, entity_key, field, old_value, new_value, unit, section)`.

---

## 3. Data Parsers & Extraction Strategy

| Domain | Section | Extracted Aeronautical Elements | Validation & Integrity Rules |
|--------|---------|---------------------------------|-----------------------------|
| **Airports** | AD 2.1 / 2.2 | Official aerodrome name (AD 2.1), operator name (AD 2.2), ARP coordinates, elevation, reference temperature, magnetic variation, geoid undulation | Authentic AD 2.1 name separated from AD 2.2 operator (e.g. EBBR: `BRUSSELS / Brussels-National` vs `Brussels Airport Company N.V./S.A.`) |
| **Hours** | AD 2.3 | Operating hours for Operator, ATS, Customs, AIS | Strictly preserves raw schedule; no false `H24` default |
| **Safety** | AD 2.6 | Rescue & Fire Fighting Category (CAT 1–10) | Preserves published text; no false `CAT 10` default |
| **Runways** | AD 2.12 | Designators, true bearings, dimensions (L×W), surface type, PCR/PCN strength, THR/TDZ coordinates & elevations | Rowspan state machine; strips typography non-breaking spaces; no false `ASPH` default |
| **Distances** | AD 2.13 | TORA, TODA, ASDA, LDA declared distances and operational runway remarks | Strips Unicode thin spaces (`\u2009`) before integer conversion |
| **Comms** | AD 2.18 | ATS frequencies (TWR, APP, ATIS, GND, RADAR) | Frequency paired with channel notation |
| **Nav Aids** | AD 2.19 & ENR 4.1 | DVOR, DME, NDB, ILS (Localizer, Glide Path, Collocated DME, Marker Beacons) | Natural key disambiguation for duplicate marker beacon audio IDs |
| **Waypoints**| ENR 4.4 | 5-letter significant points, exact coordinates, associated ATS routes | Strict WGS84 range validation |
| **Airways** | ENR 3.2 | RNAV ATS routes, navigation specifications, waypoint sequence, segment distances | Reconstructed polyline disclaimer; no surveyed track claims |
| **Airspace** | ENR 2.1 & ENR 5.1 | CTA, TMA, UIR, FIR, Restricted (EBR), Danger (EBD), UAS zones | Great-circle circular polygon generator (36 vertices); border and arc exclusion safeguards |

---

## 4. Airspace & Geometry Safeguards

### 4.1 Great-Circle Circular Airspace Generator
For circular areas defined by a center coordinate and a radius in nautical miles (e.g. `A circle, 0.8 NM radius, centred on 500958N 0050628E`), coordinates are calculated using spherical trigonometry:
$$\phi_2 = \arcsin\left(\sin\phi_1 \cos\delta + \cos\phi_1 \sin\delta \cos\theta\right)$$
$$\lambda_2 = \lambda_1 + \operatorname{atan2}\left(\sin\theta \sin\delta \cos\phi_1, \cos\delta - \sin\phi_1 \sin\phi_2\right)$$
where $\delta = \frac{d}{R}$, $R = 6371000$ m, $d = r_{\text{NM}} \times 1852$ m, and $\theta \in [0, 2\pi]$ across 36 steps, generating a closed GeoJSON `[lon, lat]` ring.

### 4.2 Non-Fabrication Rule for Complex Boundaries
Where boundaries reference international borders (`along the Belgian-Dutch border`) or complex circular arcs (`an arc of circle, 0.8 NM radius...`), the geometry parser:
1. Refuses to fabricate approximate vertices or straight-line shortcuts.
2. Emits an explicit structured issue (`BORDER_UNRESOLVED` or `ARC_UNRESOLVED`).
3. Retains the complete textual description.
4. Excludes the feature from the visual map layer while keeping it accessible in the Airspace Verification Log.

---

## 5. Automated Verification Results

* **Python Unit Tests:** **84 passed / 84 total** (`pytest`)
* **Node.js Express API Tests:** **8 passed / 8 total** (`server/tests/api.test.ts`)
* **Frontend TypeScript Compilation:** **Clean build (`tsc && vite build`)**
