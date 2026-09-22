# AuraNER / NER-Route AI — Design System & Component Library

## 1. Design Tokens & Foundations

The design system is engineered for dark-mode-first high visual fidelity, mission-critical clarity, and low eye fatigue during extended dispatcher shifts.

### 1.1 Color Tokens ("Borders of Nature & Tech")

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COLOR TOKEN PALETTE                                │
├─────────────────┬───────────┬───────────────────────────────────────────────┤
│ Token Name      │ Hex Code  │ Semantic Usage & Meaning                      │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `forest-500`    │ `#080C0A` │ Deepest canvas background; extreme contrast.  │
│ `forest-400`    │ `#0E1612` │ Main page viewport background.                │
│ `forest-300`    │ `#14201A` │ Primary container & sidebar background.       │
│ `forest-200`    │ `#1A2E23` │ Elevated card, modal, & panel surfaces.       │
│ `forest-100`    │ `#213830` │ Interactive hover & selected surface state.   │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `mist` (Default)│ `#E2E8F0` │ Primary high-contrast text & active icons.    │
│ `mist-dim`      │ `#94A3B8` │ Secondary text, labels, & table headers.      │
│ `mist-muted`    │ `#64748B` │ Disabled states, timestamps, & captions.      │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `orchid`        │ `#A855F7` │ AI Copilot, route calculations, optimization. │
│ `orchid-light`  │ `#C084FC` │ Active AI highlights & glowing borders.       │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `teal`          │ `#0D9488` │ Logistics operations, telemetry, verified pings│
│ `teal-light`    │ `#14B8A6` │ Live tracking badges & active vehicles.       │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `amber`         │ `#F59E0B` │ Warnings, high terrain risk, pending triage.  │
│ `amber-light`   │ `#FCD34D` │ Attention badges & delayed shipments.         │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `danger`        │ `#EF4444` │ Critical hazard, active landslide, SOS beacon.│
│ `danger-light`  │ `#FCA5A5` │ High-severity alert chips & destructive btn.  │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `safe`          │ `#22C55E` │ Delivered shipments, clear road, online state.│
│ `safe-light`    │ `#86EFAC` │ Success badges & verified compliance.         │
├─────────────────┼───────────┼───────────────────────────────────────────────┤
│ `info`          │ `#3B82F6` │ Informational notices, checkpoints, police post│
│ `info-light`    │ `#93C5FD` │ Inspection icons & informational badges.      │
└─────────────────┴───────────┴───────────────────────────────────────────────┘
```

### 1.2 Typography System
- **UI Font**: `'Inter', system-ui, -apple-system, sans-serif`  
  Optimized for tight visual density and high legibility across standard and high-DPI displays.
- **Monospace Font**: `'JetBrains Mono', 'Fira Code', monospace`  
  Strictly applied to GPS coordinates, telemetry values, elevation stats, shipment tracking codes, and timestamp stamps.

```
┌──────────────┬─────────────┬─────────────┬────────────┬─────────────────────┐
│ Token        │ Size / Rem  │ Line Height │ Weight     │ Standard Use Case   │
├──────────────┼─────────────┼─────────────┼────────────┼─────────────────────┤
│ `text-display`│ 32px / 2.0  │ 40px        │ 800 (Bold) │ Top-level KPI counts│
│ `text-h1`    │ 24px / 1.5  │ 32px        │ 700 (Bold) │ Page titles         │
│ `text-h2`    │ 20px / 1.25 │ 28px        │ 600 (Semi) │ Section headers     │
│ `text-h3`    │ 16px / 1.0  │ 24px        │ 600 (Semi) │ Card titles, modal h│
│ `text-body`  │ 14px / 0.875│ 20px        │ 400 (Norm) │ Standard table/para │
│ `text-body-sm`│ 13px / 0.812│ 18px        │ 400 (Norm) │ Compact feed items  │
│ `text-caption`│ 11px / 0.687│ 16px        │ 500 (Med)  │ Timestamps, legends │
│ `text-micro` │ 10px / 0.625│ 14px        │ 700 (Bold) │ Status pills/badges │
└──────────────┴─────────────┴─────────────┴────────────┴─────────────────────┘
```

### 1.3 Spacing Grid & Elevation
- **Grid Increment**: Strict 4px base (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Glassmorphism Layers**:
  - `glass`: `background: rgba(26, 46, 35, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(226, 232, 240, 0.08);`
  - `glass-heavy`: `background: rgba(26, 46, 35, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(226, 232, 240, 0.12);`
  - `glass-ai`: `background: rgba(168, 85, 247, 0.06); border: 1px solid rgba(168, 85, 247, 0.2); box-shadow: 0 0 30px rgba(168, 85, 247, 0.1);`
  - `glass-danger`: `background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); box-shadow: 0 0 25px rgba(239, 68, 68, 0.15);`

---

## 2. Component Specifications

### 2.1 Buttons (`Button.tsx`)
1. **Primary (`variant="primary"`)**:
   - Background: `bg-orchid hover:bg-orchid-dark`, text: `text-white font-semibold`.
   - Used for affirmative, high-value actions: "Dispatch Shipment", "Calculate Route".
2. **Secondary (`variant="secondary"`)**:
   - Background: `bg-forest-100 hover:bg-forest-50 border border-white/10`, text: `text-mist`.
   - Used for standard actions: "Filter List", "Export Manifest", "Add Stop".
3. **Danger (`variant="danger"`)**:
   - Background: `bg-danger hover:bg-danger/80`, text: `text-white font-semibold`.
   - Used for destructive or emergency operations: "Cancel Shipment", "Decommission Vehicle".
4. **Emergency SOS (`variant="sos"`)**:
   - Background: Pulsing `bg-danger border-2 border-white shadow-danger-glow`, text: `text-white font-extrabold uppercase`.
   - Dedicated to driver and dispatcher crisis triggers.
5. **Button States**:
   - *Loading*: Disabled with spinning loader icon (`animate-spin`) and label replaced with "Processing...".
   - *Disabled*: `opacity-40 cursor-not-allowed pointer-events-none`.

### 2.2 Form Controls & Inputs
- **Text & Number Input**:
  - Background: `bg-forest-300 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-mist placeholder:text-mist-muted focus:border-orchid focus:ring-1 focus:ring-orchid outline-none transition-all`.
- **Search Bar**:
  - Prefixed with `Search` icon; integrated `Esc` or `Clear (X)` button; automatic 300ms input debounce.
- **Select Dropdown**:
  - Custom styled with chevron indicator; popover panel uses `glass-heavy` with scrollable option rows.
- **Toggle Switch**:
  - Track: `w-11 h-6 bg-forest-100 rounded-full transition-colors peer-checked:bg-orchid`.
  - Thumb: `w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5`.
- **Validation Feedback**:
  - Error state highlights border in `border-danger`; appends micro error message below input in `text-danger text-xs flex items-center gap-1`.

### 2.3 Data Tables (`DataTable.tsx`)
- **Container**: Rounded glass container (`bg-forest-200/60 border border-white/10 overflow-hidden`).
- **Header (`<thead>`)**:
  - Height 40px, `bg-forest-300/80 text-mist-dim text-xs font-semibold uppercase tracking-wider border-b border-white/10`.
  - Interactive sortable columns with ascending/descending chevron indicators.
- **Row (`<tr>`)**:
  - Height 48px, `border-b border-white/[0.04] hover:bg-forest-100/50 transition-colors`.
  - Zebra striping: alternate rows shaded with `bg-white/[0.015]`.
  - First column checkbox for multi-row batch actions.
- **Pagination Footer**:
  - Displays "Showing 1-15 of 142 items", items-per-page selector (15, 30, 50), and pagination buttons.

### 2.4 Metric Cards (`KPICard.tsx`)
- **Structure**: Icon badge, metric title (`text-mist-dim text-xs font-medium`), primary value (`text-2xl font-extrabold text-white font-mono`), and contextual change trend pill.
- **Trend Pill**:
  - Positive improvement: `bg-safe/20 text-safe-light flex items-center gap-1 text-[0.7rem] px-2 py-0.5 rounded-full`.
  - Elevated risk / deterioration: `bg-danger/20 text-danger-light flex items-center gap-1 text-[0.7rem] px-2 py-0.5 rounded-full`.

### 2.5 Badges & Status Chips (`Badge.tsx`)
- Standardized pill format: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.65rem] font-bold border`.
- Variants:
  - `CRITICAL`: Red background + red text + pulse dot (`bg-danger/20 text-danger-light border-danger/30`).
  - `HIGH`: Amber background + amber text (`bg-amber/20 text-amber-light border-amber/30`).
  - `MODERATE` / `IN_TRANSIT`: Blue background (`bg-info/20 text-info-light border-info/30`).
  - `LOW` / `DELIVERED`: Green background (`bg-safe/20 text-safe-light border-safe/30`).
  - `AI_GENERATED`: Purple background (`bg-orchid/20 text-orchid-light border-orchid/30`).
  - `PROVENANCE_LIVE`: Teal background with active pulsing beacon dot (`bg-teal/20 text-teal-light border-teal/30`).

### 2.6 Live Status Indicators
- **Radar Beacon**:
  ```html
  <span class="relative flex h-2.5 w-2.5">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75"></span>
    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-light"></span>
  </span>
  ```
- **Hazard Flasher**:
  ```html
  <span class="relative flex h-3 w-3">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-90"></span>
    <span class="relative inline-flex rounded-full h-3 w-3 bg-danger"></span>
  </span>
  ```

### 2.7 Modals & Dialogs
- **Backdrop**: Full viewport `bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4`.
- **Panel**: `w-full max-w-lg bg-forest-200 border border-white/10 rounded-2xl shadow-glass p-6 animate-slide-up`.
- **Structure**: Title with close `(X)` icon; divider; content body; footer with right-aligned Cancel and Affirmative buttons.

### 2.8 Drawers & Slide-Out Panels
- Slide in smoothly from screen edges (`animate-slide-in-right`).
- Width: `w-[420px]` on desktop, full-width `w-full` on mobile.
- Background: `bg-forest-300 border-l border-white/10 shadow-glass`.
- Dedicated uses: AI Copilot conversation, shipment telemetry inspector, incident detail triage.

### 2.9 Map Overlays & Radar Layer Controls
- Positioned floating over the vector map with `absolute top-4 left-4 z-10`.
- Semi-transparent glass pill bar (`glass-heavy rounded-xl p-1.5 flex items-center gap-2`).
- Checkbox toggle pills for GIS layers: `[x] Fleet Radar`, `[x] Hazard Zones`, `[x] Safe Havens`, `[x] Weather Radar`.

### 2.10 Charts & Visualizations
- Rendered via Chart.js / React-ChartJS-2 styled with custom dark-mode canvases.
- Grid lines: Subdued `rgba(255, 255, 255, 0.05)`.
- Tooltip: Custom HTML glass container showing exact timestamps, values, and road sector names.

### 2.11 Toasts & Notification Banners
- Fixed bottom-right `fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none`.
- Individual toast has `pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-glass border`.
- Automatic dismiss after 5,000ms with a thin progress bar depleting at the bottom.
