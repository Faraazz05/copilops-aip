# CopilOPS AIP — Automation, Data Refresh & Cloud Architecture

> **Author:** Mohd Faraz — [faraazz05.github.io](https://faraazz05.github.io)  
> **Source Repository:** [github.com/faraazz05/copilops-aip](https://github.com/faraazz05/copilops-aip)

This document provides a technical explanation of:
1. **Cloud Environment Variables & Deployment Parameters** (Render.com, MongoDB Atlas, GitHub).
2. **The 28-Day ICAO AIRAC Cycle Refresh Architecture** (How new data is ingested, cleaned, validated, diffed, and deployed automatically every 28 days without manual code modifications).
3. **Data Cleaning & Anomaly Isolation Framework**.

---

## 1. Cloud Infrastructure & Environment Variables

### A. Environment Variables Required in Render

When deploying the Web Service on [Render.com](https://render.com) using our [Dockerfile](file:///c:/Users/spfar/Desktop/copilops-aip/Dockerfile), the following environment variables are configured:

| Variable Name | Required? | Recommended Value | Purpose & Description |
|---|:---:|---|---|
| `NODE_ENV` | **Yes** | `production` | Enables Express production optimizations, security headers, and compression. |
| `PORT` | **Yes** | `5000` | Port on which the container's Express HTTP server listens. Render forwards external traffic from `80/443` to this port. |
| `MONGODB_URI` | Optional* | `mongodb+srv://copilops_admin:<password>@cluster0.abcde.mongodb.net/copilops_aip?retryWrites=true&w=majority` | Connection string to MongoDB Atlas. <br/>*\*Note: If omitted, the server operates in zero-config mode, falling back to the bundled offline JSON dataset (`server/data/aeronautical_data.json`).* |

---

### B. What You Need to Get from Each Service

```
┌─────────────────────────────────┐
│     1. MongoDB Atlas            │
│     (Database Cloud)            │
└──────────────┬──────────────────┘
               │  Connection String (MONGODB_URI)
               ▼
┌─────────────────────────────────┐
│     2. Render.com               │ ◄─── Multi-stage Dockerfile
│     (Web Service / Container)   │      Express REST API + SPA
└──────────────┬──────────────────┘
               │  Production URL (https://copilops-aip.onrender.com)
               ▼
┌─────────────────────────────────┐
│     3. GitHub Pages             │
│     (Static Portfolio Demo)     │ ◄─── Root index.html + assets/
└─────────────────────────────────┘      https://faraazz05.github.io/copilops-aip/
```

#### 1. From MongoDB Atlas (Free M0 Cluster):
* **Cluster:** A free MongoDB M0 cluster (e.g. Frankfurt / `eu-central-1`).
* **Database User:** A username and password (e.g. `copilops_admin` and your chosen password).
* **Network Access (IP Whitelist):** `0.0.0.0/0` (Allow access from anywhere, required because Render uses dynamic IP pools).
* **What you take from Atlas:** The **Connection String (`MONGODB_URI`)**:
  ```text
  mongodb+srv://<username>:<password>@<cluster-domain>/copilops_aip?retryWrites=true&w=majority
  ```

#### 2. From Render.com:
* **GitHub Integration:** Select `https://github.com/faraazz05/copilops-aip`.
* **Runtime:** Select `Docker`. Render builds the multi-stage [`Dockerfile`](file:///c:/Users/spfar/Desktop/copilops-aip/Dockerfile) automatically.
* **What you get from Render:** A live public HTTPS URL (e.g. `https://copilops-aip.onrender.com`).

#### 3. From GitHub:
* Repository hosting: `https://github.com/faraazz05/copilops-aip`
* GitHub Actions runner for automated AIRAC processing ([`.github/workflows/airac_cron.yml`](file:///c:/Users/spfar/Desktop/copilops-aip/.github/workflows/airac_cron.yml)).
* GitHub Pages static hosting: `https://faraazz05.github.io/copilops-aip/`.

---

## 2. How the Data Refreshes, Cleans & Updates Every 28 Days

A central requirement of the assessment is **avoiding hard-coded assumptions** and designing a system that seamlessly handles the international **28-day ICAO AIRAC cycle**.

### The ICAO AIRAC 28-Day Standard

In international civil aviation, aeronautical updates adhere to the 28-day Aeronautical Information Regulation and Control (AIRAC) cycle (always effective on a Thursday at 00:00 UTC).

```
Cycle 08/2026: 2026-08-06
Cycle 09/2026: 2026-09-03
Cycle 10/2026: 2026-10-01 (Current Assessment Cycle)
Cycle 11/2026: 2026-10-29
Cycle 12/2026: 2026-11-26
Cycle 13/2026: 2026-12-24
```

### The 4-Stage Automated Pipeline

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. INGESTION & SCRAPING (skeyes eAIP)                  │
  │    Fetches new eAIP Package (AD 2.x, ENR 3.x, ENR 4.x) │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. VALIDATION & NORMALIZATION (run_pipeline.py)        │
  │    - DMS -> Decimal degrees conversion                 │
  │    - Table rowspan dynamic reconstruction              │
  │    - Typo & missing hemisphere resolution              │
  │    - Anomaly logging into `issues` table               │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. AIRAC CYCLE DIFFING (run_diff.py)                   │
  │    - Compare Cycle (N-1) with Cycle (N)                │
  │    - Classify: NEW | MODIFIED | DELETED | UNCHANGED    │
  │    - Store change delta in `changes` collection        │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. ZERO-DOWNTIME REFRESH (export_data.py / Mongoose)   │
  │    - Upsert collections in MongoDB Atlas               │
  │    - Update static fallback cache                      │
  │    - UI & API immediately serve latest active cycle    │
  └────────────────────────────────────────────────────────┘
```

#### Stage 1: Ingestion (Data-Driven Discovery)
* The pipeline does not hardcode aerodrome IDs or runway numbers.
* The parser scans the eAIP index and iterates through all available sections:
  * `AD 2.2` (Geographical coordinates & ARP)
  * `AD 2.3` (Operational hours)
  * `AD 2.6` (RFFS Rescue categories)
  * `AD 2.12` (Runway physical characteristics & coordinates)
  * `AD 2.13` (Declared distances: TORA, TODA, ASDA, LDA)
  * `AD 2.18` (ATS communication facilities)
  * `AD 2.19` (Radio navigation & landing aids)
  * `ENR 3.2` (Upper ATS routes)
  * `ENR 4.1` (Radio navigation aids)
  * `ENR 4.4` (Waypoints & significant points)

#### Stage 2: Data Cleaning & Anomaly Isolation
AIP publications frequently contain OCR errors, missing hemisphere characters, non-standard typography, or malformed table cells:
1. **Missing Hemisphere Resolution:** When skeyes published EBCI RWY 24 coordinates without 'N' (`502720.59 0042618.93E`), the coordinate parser:
   - Detects the missing hemisphere.
   - Infers latitude bounds based on Belgium geographic envelope ($49.5^\circ\text{N}$ to $51.5^\circ\text{N}$).
   - Emits a non-fatal `Issue(severity="WARN", code="MISSING_HEMISPHERE")` into the database for auditability.
2. **Duplicate Identifier Resolution:** Navaids sharing generic morse descriptors (`"dash / dash"` for Outer Markers) are disambiguated by deriving keys from their aerodrome and threshold association (`OM-RWY01-EBBR`).
3. **Typography Normalization:** Handles Unicode multiplication glyphs (`×` $\rightarrow$ `x`), non-breaking thin spaces, and carriage returns in declared distance cells.

#### Stage 3: AIRAC Cycle Diffing & Provenance Tracking
* Rather than overwriting old data destructively, the pipeline retains historical facts:
  ```sql
  SELECT * FROM facts WHERE edition = '2026-10-01';
  SELECT * FROM facts WHERE edition = '2026-09-04';
  ```
* The diff engine audits each entity:
  * **NEW:** Runway 07R/25L newly commissioned.
  * **MODIFIED:** Declared distance LDA reduced from 3,211 m to 3,000 m.
  * **DELETED:** Decommissioned VOR or NDB aid.
  * **UNCHANGED:** Stable infrastructure.
* Changes are written to the `changes` table/collection so flight dispatchers immediately see what changed between cycles.

#### Stage 4: Continuous Deployment & Automation
Every 28 days on the AIRAC publication date:
1. **Automated Trigger:** The GitHub Actions workflow ([`.github/workflows/airac_cron.yml`](.github/workflows/airac_cron.yml)) triggers on schedule (`cron: '0 0 * * 4'`).
2. **Orchestrator Execution:** [`scripts/airac_cycle_manager.py`](scripts/airac_cycle_manager.py) computes the active ICAO cycle and runs:
   ```bash
   python scripts/airac_cycle_manager.py --effective 2026-10-29 --previous 2026-10-01
   ```
3. **Database Upsert:** The updated documents are uploaded to MongoDB Atlas and `server/data/aeronautical_data.json`.
4. **Zero-Code Change Deployment:** The Express REST API and React single page application automatically read and visualize the new AIRAC cycle data.
