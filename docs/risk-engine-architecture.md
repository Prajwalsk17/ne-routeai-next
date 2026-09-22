# Risk Engine Architecture

## 1. Executive Summary & Core Architectural Principle

The **AuraNER / NER-Route AI Risk Engine** provides production-grade operational risk calculation and situational hazard intelligence engineered specifically for India's **North Eastern Region (NER)**:
- Arunachal Pradesh (AR)
- Assam (AS)
- Manipur (MN)
- Meghalaya (ML)
- Mizoram (MZ)
- Nagaland (NL)
- Sikkim (SK)
- Tripura (TR)

The engine strictly adheres to the platform's core operational principle:
```
AI reasons.
APIs provide facts.
Algorithms calculate.
Backend enforces.
Humans approve critical decisions.
```

Risk calculations are rooted in actual verified data sources and deterministic mathematical formulas. Operational conditions are never fabricated, and AI models are strictly prohibited from inventing factual events.

---

## 2. Core Pillars & Tripartite Separation

The architecture enforces a strict tripartite separation of concerns:

```
┌─────────────────────────┐
│   APIs Provide Facts    │ ◄─── Real authoritative feeds (IMD, BRO, CWC, SDMA, GPS telemetry)
│    (Observed Data)      │      Zero fabrication invariant
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Algorithms Calculate   │ ◄─── Deterministic mathematical sub-indices (w1=0.35, w2=0.30, w3=0.20, w4=0.15)
│    (Calculated Risk)    │      Verifiable weights, factor attribution, explainable formula
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       AI Reasons        │ ◄─── Contextual narrative, terrain advisory, precedent retrieval
│   (AI Interpretation)   │      Forbidden from modifying observed facts or calculated numbers
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│    Backend Enforces     │ ◄─── Policy gates: requiresRecalculation=true on critical blockage;
│ (Policy & Gatekeeping)  │      Automated route alerts emission
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Humans Approve Decisions│ ◄─── Mandatory human confirmation (dispatcher/driver) before
│ (Critical Confirmation) │      overriding active trip itineraries or executing detours
└─────────────────────────┘
```

### 2.1 Pillar 1: APIs Provide Facts (`observedData`)
- Facts originate exclusively from verified external providers:
  - **IMD AWS Telemetry**: Rain rate (mm/h), 24h accumulation, wind speed (km/h), visibility (km).
  - **BRO Bulletins**: Highway corridor obstructions, blockage nature (`BOTH_LANES_BLOCKED`, `SINGLE_LANE_OPEN`), clearance ETAs.
  - **CWC River Gauges**: Water stage levels across Brahmaputra and Barak basins.
  - **SDMA Declarations**: Village isolation notices, bridge washouts.
  - **In-Cab Telemetry**: GPS speed, multipath horizontal jitter, dead reckoning latency.
  - **Digital Elevation Models (DEM)**: Road segment slope gradient %, peak elevation (m), terrain type.
- **Zero Fabrication Invariant**: In the absence of a weather station reading along a corridor, the system explicitly reports 0 active readings and lowers the factor confidence score ($0.95 \to 0.70$) rather than inventing synthetic numbers.

### 2.2 Pillar 2: Algorithms Calculate (`calculatedRisk`)
- Mathematical calculations are deterministic, reproducible, and verifiable.
- **Sub-Indices & Weight Allocation**:
  $$\text{CompositeScore} = w_1 S_{\text{infra}} + w_2 S_{\text{meteo}} + w_3 S_{\text{topo}} + w_4 S_{\text{telemetry}}$$
  Where weights strictly sum to 1.0:
  $$w_1 = 0.35 \quad (\text{Infrastructure Passability})$$
  $$w_2 = 0.30 \quad (\text{Meteorological Intensity})$$
  $$w_3 = 0.20 \quad (\text{Topographical Gradient \& Elevation})$$
  $$w_4 = 0.15 \quad (\text{Operational Telemetry Jitter})$$
- **Mathematical Formulations**:
  - *Infrastructure ($S_{\text{infra}}$)*:
    - $\text{Blockage} = \text{BOTH\_LANES\_BLOCKED} \to 1.0$ (Critical block)
    - $\text{Blockage} = \text{SINGLE\_LANE\_OPEN} \to 0.55$
    - $\text{Blockage} = \text{TEMPORARY\_DIVERSION} \to 0.40$
    - Surface condition degradation: $\frac{100 - \text{score}}{100} \times 0.50$
  - *Meteorological ($S_{\text{meteo}}$)*:
    - Precipitation: $\ge 50 \text{ mm/h} \to 1.0$; $25 \dots 50 \to 0.75$; $10 \dots 25 \to 0.45$; $<10 \to P / 25$
    - Wind: $\ge 70 \text{ km/h} \to 0.90$; $45 \dots 70 \to 0.50$; $<45 \to W / 150$
    - Visibility: $<0.5 \text{ km} \to 0.90$; $0.5 \dots 2 \text{ km} \to 0.45$; $\ge 2 \text{ km} \to 0.05$
  - *Topographical ($S_{\text{topo}}$)*:
    - Slope gradient: $\text{grade} > \text{vehicleThreshold} \to 1.0$ (Critical physical exceedance)
    - High altitude: $\ge 2500\text{m} \to 0.80$ (Ice & oxygen risk); $\ge 1500\text{m} \to 0.40$; $<1500\text{m} \to 0.10$
    - Mountain terrain density: Ratio of mountainous segments $\times 0.80$
  - *Telemetry ($S_{\text{telemetry}}$)*:
    - Horizontal multipath jitter: $\min(1.0, \text{jitter} / 50\text{m}) \times 0.35$
    - Dead reckoning duration: $\min(1.0, \text{outage} / 300\text{s}) \times 0.40$
- **Severity Classification**:
  - `LOW`: Composite score $< 0.25$
  - `MEDIUM`: $0.25 \le \text{CompositeScore} < 0.55$
  - `HIGH`: $0.55 \le \text{CompositeScore} < 0.75$
  - `CRITICAL`: $\text{CompositeScore} \ge 0.75$ OR confirmed corridor blockage

### 2.3 Pillar 3: AI Reasons (`aiInterpretation`)
- Semantic AI model provides operational context, terrain implications, and narrative synthesis.
- Strictly operates upon the outputs of Pillars 1 & 2.
- **Constraints**:
  - The model CANNOT alter or override factual observed data.
  - The model CANNOT alter or override calculated mathematical scores.
  - The output is clearly demarcated as `aiInterpretation`.

### 2.4 Pillar 4: Backend Enforces (`requiresRecalculation`)
- Automated policy gates evaluate calculated scores:
  - If a total corridor blockage is detected, backend forces `requiresRecalculation = true`.
  - If composite score is `CRITICAL`, triggers immediate emergency alerts to drivers and dispatchers via `createRouteAlert`.
  - If gradient slope exceeds vehicle physical specifications, flags `thresholdTriggered = true`.

### 2.5 Pillar 5: Humans Approve Critical Decisions (`requiresHumanApproval`)
- Any high-impact operational action (diverting shipments, recalculating active trips, or aborting missions) mandates explicit human confirmation:
  $$\text{requiresHumanApproval} = (\text{severity} == \text{'CRITICAL'}) \lor (\text{requiresRecalculation} == \text{true})$$
- Automated systems prepare alternative candidate detours, but the final execution requires driver or dispatcher authorization.

---

## 3. Data Model & REST API Contracts

### 3.1 Situational Risk Events (`risk_events`)
- Encapsulates physical hazards (landslides, flash floods, bridge washouts, security restrictions).
- Geographic boundary validation ensures coordinates fall strictly within the Northeast India operational bounding box ($21.5^\circ\text{N} \dots 29.5^\circ\text{N}, 88.0^\circ\text{E} \dots 97.5^\circ\text{E}$).

### 3.2 REST API Routes
- `POST /api/v1/risk/calculate`:
  - Input: Route segments, vehicle location, weather events, road events, telemetry, vehicle specs.
  - Output: Full `RiskCalculationResult` with factors, sub-indices, observed facts, and explainability.
  - Authorization: Requires `routes:calculate` (`SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `DRIVER`).
- `GET /api/v1/risk/events`:
  - Lists active situational hazard events with state/category filters.
  - Authorization: Requires `data:read`.
- `POST /api/v1/risk/events`:
  - Registers a new verified risk event.
  - Authorization: Requires `data:ingest` (`SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`).
- `PATCH /api/v1/risk/events/[id]`:
  - Updates or resolves a risk event with resolution audit notes.
  - Authorization: Requires `data:ingest`.
