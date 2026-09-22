# AuraNER / NER-Route AI — Accessibility & Inclusivity Guidelines

## 1. Compliance Standard & Philosophy

**NER-Route AI** adheres to the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA** across both the Owner Web Portal and the Driver Mobile App.

In the context of the North Eastern Region, accessibility extends beyond standard physical disabilities to encompass **environmental and situational impairments**:
- Heavy vehicle vibration on unpaved mountain roads.
- Intense high-altitude solar glare in mountain passes (e.g. Sela Pass at 4,170m).
- Pitch-black night driving in unlit jungle gorges with zero ambient street lighting.
- High cognitive stress during natural disasters (landslides, flash floods).

---

## 2. Visual Accessibility & Color Independence

### 2.1 Multi-Sensory State Representation (Never Color Alone)
Every operational status, alert severity, and hazard must be identifiable by at least **three distinct visual cues**:
1. **Color Token** (e.g., Red for Critical, Amber for Warning).
2. **Iconographic Glyph** (e.g., `AlertOctagon` for Critical, `AlertTriangle` for Warning, `CheckCircle2` for Safe).
3. **Textual Label** (explicit text "CRITICAL", "HIGH RISK", "ALL CLEAR").

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-SENSORY RISK INDICATOR                          │
├─────────────────┬──────────┬──────────────┬───────────────┬─────────────────┤
│ Risk Tier       │ Color    │ Icon Glyph   │ Textual Pill  │ Shape Indicator │
├─────────────────┼──────────┼──────────────┼───────────────┼─────────────────┤
│ Critical        │ Danger   │ AlertOctagon │ [! CRITICAL]  │ Hexagon         │
│ High            │ Amber    │ AlertTriangle│ [▲ HIGH RISK] │ Triangle        │
│ Moderate        │ Info     │ InfoIcon     │ [ℹ ADVISORY]  │ Circle          │
│ Safe / Clear    │ Safe     │ CheckCircle  │ [✓ ALL CLEAR] │ Shield          │
└─────────────────┴──────────┴──────────────┴───────────────┴─────────────────┘
```

### 2.2 Contrast Ratio Requirements
- **Standard Body Text**: Minimum contrast ratio of **$4.5:1$** against background (`mist #E2E8F0` on `forest-400 #0E1612` achieves $> 12:1$).
- **Large Text & Headings**: Minimum contrast ratio of **$3.0:1$**.
- **Interactive UI Components & Borders**: Minimum contrast ratio of **$3.0:1$** against adjacent surfaces.

---

## 3. Mountain Environmental Display Modes

### 3.1 High-Glare Mountain Daylight Mode (Mobile & Rugged Laptops)
- **Problem**: Direct sunlight at high elevations washes out standard dark displays.
- **Solution**: High-contrast mode toggle:
  - Vector roads render with thick black casing and high-contrast yellow/white centerlines.
  - Text rendered in ultra-black `#000000` on pure white `#FFFFFF` cards.
  - Map tiles switch to high-visibility terrain contours with prominent elevation shading.

### 3.2 Night Vision Cab Mode (Default Dark Theme)
- **Problem**: Bright displays inside an unlit truck cab blind the driver to the road ahead.
- **Solution**: "Borders of Nature" palette:
  - Deep forest greens (`#14201A`) and muted mists (`#94A3B8`).
  - Red lights reserved strictly for critical immediate threats.
  - Blue light emissions minimized to reduce retinal fatigue.

---

## 4. Screen Reader & Assistive Technology Integration

### 4.1 Semantic Markup & ARIA Landmarks
- Main content wrapped in `<main id="main-content" role="main">`.
- Primary navigation tagged with `<nav aria-label="Main Navigation">`.
- Live GIS radar tagged with `<section aria-label="Geospatial Fleet Radar" role="region">`.
- Top skip link: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`.

### 4.2 Dynamic Live Regions (`aria-live`)
- **Critical Hazard Warnings**:
  ```html
  <div role="alert" aria-live="assertive" aria-atomic="true">
    Warning: Landslide detected 3.2 kilometers ahead on NH-29. Immediate detour advised.
  </div>
  ```
- **Telemetry Stream Counter**: Uses `aria-live="polite"` to avoid interrupting screen readers with high-frequency coordinate pings.

---

## 5. In-Cab Auditory & Haptic Feedback

For moving vehicles, visual gaze must remain on the mountain highway:

### 5.1 Auditory Signals
- **Hairpin Bend & Steep Gradient Tone**: Soft dual-tone chime ($650\text{Hz} \to 800\text{Hz}$) sounded 200m before maneuver.
- **Critical Hazard Alert Siren**: Distinct, high-urgency alternating tone ($1,000\text{Hz} \leftrightarrow 1,400\text{Hz}$) breaking through vehicle audio.
- **Text-to-Speech (TTS) Voice Guidance**: Multi-lingual synthesized voice instructions in English, Hindi, Assamese, and Bengali.

### 5.2 Haptic Patterns
- **Standard Maneuver**: Single short vibration pulse ($150\text{ms}$).
- **Proximity Warning ($< 5\text{km}$)**: Triple pulse ($150\text{ms} \times 3$).
- **Emergency SOS Confirmation**: Long sustained vibration ($1,000\text{ms}$).

---

## 6. Motor Impairment & In-Motion Error Prevention

1. **Large Touch Ergonomics**:
   - Primary action buttons sized at $56\text{pt} - 64\text{pt}$ height on mobile.
   - Spacing between adjacent buttons minimum $16\text{pt}$ to prevent accidental activation.
2. **Gesture Slip Protection**:
   - Critical triggers (e.g. SOS activation, aborting an in-transit mission) require **Slide-to-Confirm** or **Press-and-Hold for 3 seconds** rather than a single tap.
