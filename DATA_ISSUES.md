# Data Quality Issues & Ambiguities Identified in the Belgium & Luxembourg eAIP

During the ingestion, parsing, and validation of the official skeyes eAIP publication (AIRAC cycle 2026-10-01), the following data quality issues, ambiguities, and formatting inconsistencies were detected by the pipeline:

---

### 1. Missing Hemisphere Letter on Runway Coordinates (EBCI AD 2.12)
* **Location:** `EB-AD-2.EBCI-en-GB.html`, AD 2.12 (Runway Physical Characteristics), RWY 24 opposite end coordinate.
* **Raw AIP Text:** `502720.59 \n 0042618.93E`
* **Issue:** The latitude coordinate is missing the mandatory hemisphere designator `N` (expected `502720.59N`).
* **Impact:** Standard ICAO coordinate parsers rejecting non-conforming strings will fail on this record.
* **Pipeline Handling:** The parser flags a `WARN / MISSING_HEMISPHERE` issue, reconstructs the missing `N` based on territorial bounds, and successfully converts the coordinate to decimal degrees (`50.455719°`).

---

### 2. Duplicate Identifiers for Marker Beacons (AD 2.19 across EBBR, EBLG, EBCI)
* **Location:** Section AD 2.19 (Radio Navigation and Landing Aids) at EBBR, EBLG, and EBCI.
* **Raw AIP Text:** 
  * Outer Markers: Identifier published as `dash / dash` (representing Morse audio code).
  * Middle Markers: Identifier published as `dot / dash`.
* **Issue:** Multiple physically distinct markers share the identical identifier string `dash / dash` at the same airport (e.g. EBBR has three distinct OMs on runways 01, 25L, and 25R).
* **Impact:** Relational and graph databases using `(airport, type, identifier)` natural keys suffer primary key collisions.
* **Pipeline Handling:** The parser inspects the Remarks column for threshold associations (e.g. `THR 01`) and synthesizes unique natural keys (e.g. `OM-RWY01-EBBR`, `OM-RWY25L-EBBR`).

---

### 3. Unicode Multiplication Glyph in Runway Dimensions (EBTN AD 2.12)
* **Location:** `EB-AD-2.EBTN-en-GB.html`, AD 2.12.
* **Raw AIP Text:** `728 × 30` (using Unicode `\u00d7` multiplication sign).
* **Issue:** In other airports, ASCII `x` is used (`2987 x 50`).
* **Impact:** Regex patterns expecting ASCII `x` fail to extract length and width.
* **Pipeline Handling:** The parser uses `[xX\u00d7]` to normalize all dimension delimiters.

---

### 4. Narrow No-Break Spaces in Numeric Values
* **Location:** Throughout AD 2.12 and AD 2.13 (Runway dimensions, declared distances).
* **Raw AIP Text:** `2\u2009987` or `3\u2009690` (using Unicode `\u2009` THIN SPACE or `\u202f` NARROW NO-BREAK SPACE).
* **Issue:** Numbers are formatted for human typography rather than machine consumption.
* **Impact:** Naive `int()` or `float()` conversions in Python throw `ValueError`.
* **Pipeline Handling:** Dedicated stripping of `\u2009`, `\u202f`, and `\xa0` before numeric parsing.

---

### 5. Omission of Runway End Coordinates for Unpaved / Small Aerodromes
* **Location:** EBAM, EBBT, EBCF, EBGB, EBSH AD 2.12.
* **Issue:** Runway physical table contains rows for grass runways, but THR coordinate cells are left completely empty without an explicit `NIL` or `-`.
* **Pipeline Handling:** The parser treats empty or whitespace-only cells as intentionally unpublished rather than corrupt coordinates.

---

### 6. Cross-Referenced Textual Station Elevation (EBMB AD 2.2)
* **Location:** EBMB (Melsbroek Military) AD 2.2.
* **Raw AIP Text:** `See AD 2.EBBR .`
* **Issue:** Instead of publishing numerical elevation in feet, a textual pointer to the civilian airport is provided.
* **Pipeline Handling:** The parser logs `WARN / ELEV_PARSE` and retains the textual cross-reference without crashing.

---

### 7. Dual Frequencies & Channels Combined in Single Table Cell (ENR 4.1)
* **Location:** `EB-ENR-4.1-en-GB.html` (Radio Navigation Aids).
* **Raw AIP Text:** `114.900 MHZ CH 96X` or `113.500 MHZ (CH 82X)`.
* **Issue:** Paired VHF frequency and TACAN/DME channel are concatenated into a single cell with inconsistent parenthesis usage.
* **Pipeline Handling:** Separate regular expression extractors for frequency (`(\d+\.\d+)\s*MHZ`) and channel (`CH\s*(\d+[XY]?)`).
