# AuraNER / NER-Route AI — Universal UI State Specification

## 1. Six-State Resilience Architecture

In rugged environments where power grids and cellular networks fluctuate, UI components must never fail silently, show blank cards, or leave operators guessing.

Every major screen and data-backed widget implements the **Universal Six-State Model**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          UNIVERSAL SIX-STATE MODEL                          │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ State           │ Primary Visual Language & Operator Experience             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ 1. Loading      │ Geometry-matched skeleton shimmers; pulse animations.     │
│ 2. Empty        │ Contextual icon, informative copy, primary action CTA.    │
│ 3. Error        │ Non-alarming diagnosis, correlation ID, non-blocking retry│
│ 4. Unavailable  │ Provider outage notice + active fallback explanation.     │
│ 5. Stale-Data   │ Amber staleness chip, last sync timestamp, refresh button.│
│ 6. Offline      │ Offline mode banner, outbox queue count, disabled actions.│
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. State-by-State Detailed Specifications

### 2.1 State 1: Loading State (Skeleton Shimmer)
- **Rule**: Never present a full-screen blank page or generic center spinner. Use **content-shaped skeleton placeholders** matching the exact dimensions of final data.
- **Visuals**:
  - Base: `bg-forest-100/50 rounded-lg`.
  - Shimmer overlay: CSS linear gradient animation traversing horizontally (`animation: shimmer 1.5s infinite`).
  - Table rows: 5 horizontal shimmer bars with alternating widths (e.g. `w-32`, `w-48`, `w-20`).
  - Map radar: Vector canvas loads dark basemap while showing a pulsing circular radar sweep.
- **Interactivity**: Action buttons within loading containers enter a disabled, spinning loading state (`pointer-events-none opacity-60`).

---

### 2.2 State 2: Empty State
- **Rule**: An empty state must never feel like an error or a dead end. It must provide clear instructions and an immediate primary call-to-action.
- **Structure**:
  1. Icon glyph in subtle container: `w-14 h-14 rounded-full bg-forest-100 flex items-center justify-center text-mist-dim`.
  2. Headline: Bold 16px title explaining the absence of data (e.g. "No Active Dispatches in Transit").
  3. Explanatory Body: 14px text describing how data appears (e.g. "Create a new dispatch using the planning wizard or adjust your regional filters.").
  4. Primary CTA: Prominent button (e.g. `[+ Plan New Shipment]`).
  5. Secondary CTA: (e.g. `[Clear All Filters]`).

---

### 2.3 State 3: Error State
- **Rule**: Errors must be honest, explainable, and offer a path to recovery without requiring a hard browser refresh.
- **Structure**:
  1. Icon: `AlertTriangle` in danger container (`bg-danger/20 text-danger-light`).
  2. Clear Error Headline: "Unable to retrieve real-time fleet telemetry."
  3. Actionable Explanation: "The telemetry streaming cluster rejected the connection. This may be due to high server load."
  4. Recovery Button: `[Retry Connection]` with automatic retry rate limiting.
  5. Support Correlation ID: Discreet monospace string for log investigation (`ref: err_telem_49182_guw`).

---

### 2.4 State 4: Unavailable State (Graceful Degradation)
- **Rule**: When an external provider (NextBillion, Open-Meteo, IMD) experiences downtime, the system transitions to an **Unavailable Fallback State** rather than throwing a hard error.
- **Visual Presentation**:
  - Amber notification banner docked to the affected component:
    ```
    ⚠ Meteorological Satellite Radar is currently offline. 
    AuraNER has automatically activated cached terrain baselines and local weather models.
    [View Provider Status]
    ```
- **Operational Guarantee**: Dispatch operations can continue using verified local fallback indexes without disruption.

---

### 2.5 State 5: Stale-Data State
- **Rule**: In mountain logistics, stale data can be fatal (e.g., displaying a 2-hour-old GPS location as "current" when a vehicle has entered a landslide sector). The UI **must explicitly flag data freshness**.
- **Staleness Thresholds**:
  - Telemetry GPS: Stale if last ping $> 60\text{ seconds}$.
  - Meteorological Radar: Stale if observation $> 30\text{ minutes}$.
  - Road Incident Bulletins: Stale if last sync $> 4\text{ hours}$.
- **Visual Presentation**:
  - Amber badge appended to data point: `[STALE DATA • 14m ago]`.
  - Vehicle marker on map: Desaturates to gray-green with an amber pulse halo.
  - Refresh Action: One-click `[↻ Refresh Feed]` button.

---

### 2.6 State 6: Offline State
- **Rule**: Designed for driver mobile devices and field dispatchers with severed internet connections.
- **Visual Presentation**:
  - Sticky top status pill: `[OFFLINE MODE • 4 Items Queued]`.
  - Action Disablement: Online-only actions (e.g. "Request Real-time Satellite Re-route") are disabled with a tooltip: *"Requires internet connection"*.
  - Local Storage Availability: Offline-compatible actions (e.g. "Record Checkpoint Arrival", "Save Incident Photo") remain 100% functional, saving records to the local outbox.
  - Sync Reconnect Banner: Automatically transitions to *"Connected! Syncing 4 items..."* with a green progress bar upon network restoration.
