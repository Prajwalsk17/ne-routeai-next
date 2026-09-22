# AuraNER / NER-Route AI — Driver Mobile Information Architecture (React Native / Expo)

## 1. Mobile Design Principles & Ergonomics

The **Driver Mobile Application** is designed specifically for transport operators traversing hazardous Himalayan mountain corridors (e.g., NH-29 Dimapur-Kohima, NH-2 Imphal-Kohima, NH-10 Siliguri-Gangtok, Trans-Arunachal Highway).

### 1.1 In-Cab Operational Ergonomics
1. **Large Touch Targets**: Minimum touch target size of $48\times48\text{ pt}$ (and $64\times64\text{ pt}$ for primary driving actions) to facilitate operation on bumpy, unpaved mountain roads.
2. **Glanceable Vector Navigation**: Clean visual hierarchies with prominent turn instructions, distance-to-maneuver counters, and high-contrast night/day modes.
3. **Severe Terrain Warnings**: Audio-visual chimes for extreme ascents ($> 12\%$), sharp mountain hairpins, narrow single-lane bridges, and active landslide zones.
4. **Offline First**: Full autonomy without cellular coverage; cached vector tiles, local outbox queue, and automatic background replay upon signal restoration.

---

## 2. Screen Specifications (10 Mobile Modules)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DRIVER MOBILE SCREEN FLOW                          │
│                                                                             │
│                     ┌─────────────────────────────┐                         │
│                     │  1. Driver Authentication   │                         │
│                     │  (Phone OTP / Biometrics)   │                         │
│                     └──────────────┬──────────────┘                         │
│                                    │                                        │
│                     ┌──────────────▼──────────────┐                         │
│                     │       2. Home Dashboard     │◄──────────────┐         │
│                     │ (Duty Toggle, Active Trip)  │               │         │
│                     └───────┬──────────────┬──────┘               │         │
│                             │              │                      │         │
│        ┌────────────────────▼─────┐  ┌─────▼────────────────────┐ │         │
│        │        3. My Trip        │  │     8. Emergency SOS     │ │         │
│        │(Stop-by-Stop, Cold-Chain)│  │ (Critical Beacon Slide)  │ │         │
│        └────────────┬─────────────┘  └──────────────────────────┘ │         │
│                     │                                             │         │
│        ┌────────────▼─────────────┐  ┌──────────────────────────┐ │         │
│        │     4. Navigation        │  │  6. Report Problem       │ │         │
│        │(Turn-by-Turn, Hazards)   │  │  (Landslide Photo & GPS) │ │         │
│        └────────────┬─────────────┘  └──────────────────────────┘ │         │
│                     │                                             │         │
│        ┌────────────▼─────────────┐  ┌──────────────────────────┐ │         │
│        │      5. Trip Status      │  │  10. Offline Sync Queue  │ │         │
│        │ (e-POD Signature, Photo) ├──┴──(Outbox Replay Engine)  ──┘         │
│        └──────────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 Driver Authentication (`/auth/phone`)
- **Purpose**: Fast, friction-free driver login using mobile phone number and SMS OTP, backed by biometric quick-unlock.
- **Key UI Elements**:
  - Country code selector (`+91` default).
  - 10-digit mobile number input.
  - 6-digit auto-advancing OTP input with auto-read SMS permissions.
  - Biometric quick-unlock prompt (Touch ID / Face ID) for returning drivers.
- **Primary Action**: `Verify & Start Shift`.
- **Offline Behavior**: If previously logged in, valid cryptographic tokens in secure device keystore permit offline app access for up to 72 hours.

---

### 2.2 Home Dashboard (`/home`)
- **Purpose**: At-a-glance operational overview showing duty status, vehicle assignment, active trip card, and network connectivity health.
- **Key UI Elements**:
  - Top Bar: Driver photo, duty status pill (`ON_DUTY` / `OFF_DUTY` toggle), offline queue badge (`5 queued`).
  - Active Trip Card: Origin, Destination, Total Distance (km), Progress percentage bar, Cargo summary ("Medical Vaccines — Cold Chain").
  - Urgent Safety Alert Banner: Displayed in pulsing red if an advancing hazard ($< 10\text{km}$) lies along the route.
  - Quick Action Buttons: `Start Navigation`, `Report Road Hazard`, `Call Dispatch`.
- **Primary Action**: `Resume Trip Navigation`.
- **Offline Behavior**: Displays cached active trip with an amber "Working Offline" banner.

---

### 2.3 My Trip Details (`/trip/details`)
- **Purpose**: Complete itinerary breakdown, manifest details, cold-chain temperature thresholds, and stop contacts.
- **Key UI Elements**:
  - Ordered Stops Timeline: Origin Depot $\to$ Checkpoint $1$ $\to$ Transit Warehouse $\to$ Final Hospital.
  - Manifest Accordion: Cargo items, weight (kg), handling instructions ("Keep refrigerated $2^\circ\text{C}$ to $8^\circ\text{C}$").
  - Emergency Safe Havens button: Quick list of nearest police outposts and relief centers along the route.
- **Primary Action**: `Confirm Checkpoint Arrival`.
- **Offline Behavior**: All itinerary details stored locally in SQLite; fully viewable offline.

---

### 2.4 Turn-by-Turn Navigation (`/navigation`)
- **Purpose**: High-contrast, vector map driving guidance optimized for mountain roads with real-time hazard proximity intercept.
- **Key UI Elements**:
  - Top Maneuver Banner: Next turn arrow, street/highway name (e.g. "Turn sharp right onto NH-29 in 350m").
  - Hardware-Accelerated Vector Map: 3D perspective pitch centered on vehicle, auto-rotating based on GPS heading.
  - Mountain Terrain Warning Pill: Pops up with audible tone when approaching hairpin bend or gradient $> 12\%$.
  - Advancing Hazard Banner: Red alert banner appearing when an incident is $< 5\text{km}$ ahead with "Detour Available" button.
  - Bottom Bar: Current Speed, Speed Limit, Remaining Distance (km), Remaining Time (hrs/mins), End Navigation button.
- **Primary Action**: `Follow Navigation Guidance`.
- **Offline Behavior**: Navigates using pre-downloaded offline vector tile package and locally calculated GPS route coordinates.

---

### 2.5 Trip Status & Electronic Proof of Delivery (`/trip/status`)
- **Purpose**: Execute milestone transitions and complete delivery sign-off via digital signature and photo proof.
- **Key UI Elements**:
  - Milestone Buttons: `Depart Depot`, `Clear Checkpoint`, `Arrived at Destination`.
  - e-POD Capture Screen:
    - Recipient Name & Phone input.
    - Touch canvas for recipient digital signature.
    - Camera viewfinder for taking geotagged delivery photo.
    - Cargo condition checklist (All items intact, Cold-chain seals unbroken).
- **Primary Action**: `Submit Proof of Delivery`.
- **Offline Behavior**: Signatures and compressed photos are stored in local SQLite outbox and queued for upload upon cellular connection.

---

### 2.6 Report Road Hazard (`/report-problem`)
- **Purpose**: Rapid roadside incident ingestion allowing drivers to report landslides, bridge failures, and washouts directly from the field.
- **Key UI Elements**:
  - Hazard Type Grid (Large icon buttons): `Landslide`, `Mudslip`, `Flash Flood`, `Road Block`, `Bridge Collapse`, `Accident`, `Fallen Tree`.
  - Severity Selector: `Passable with Caution`, `Single Lane Only`, `Completely Blocked`.
  - Camera Viewfinder: Quick snapshot button.
  - GPS Coordinates: Automatically populated from device GPS hardware.
- **Primary Action**: `Submit Incident Report`.
- **Offline Behavior**: Incident saved locally with timestamp and coordinates; immediately influences local rerouting engine.

---

### 2.7 Emergency SOS Trigger (`/sos`)
- **Purpose**: Critical safety beacon for driver distress, vehicle rollovers, or highway entrapment.
- **Key UI Elements**:
  - Large Red Slider: "SLIDE TO TRIGGER SOS" (slide gesture prevents accidental pocket triggers).
  - Countdown Cancel Window (5 seconds with loud beep).
  - Active Emergency Beacon State: Transmits live GPS beacon every 5 seconds to Dispatch Command Center, State Police, and Disaster Control.
  - One-Touch Emergency Call buttons: `Call Police (112)`, `Call Dispatch Command`, `Call Ambulance (108)`.
- **Primary Action**: `Slide to Activate SOS`.
- **Offline Behavior**: If cellular data is unavailable, app attempts to transmit emergency SMS beacon containing encoded coordinates.

---

### 2.8 Push Notifications & Advisories (`/notifications`)
- **Purpose**: Central log of dispatcher instructions, route recalculation prompts, and severe meteorological bulletins.
- **Key UI Elements**:
  - Notification Feed categorized by urgency (`EMERGENCY`, `ROUTE_CHANGE`, `DISPATCH`).
  - Critical alerts trigger full-screen modal with audible high-volume chime.
- **Primary Action**: `View Detour Instructions`.
- **Offline Behavior**: Notifications cached locally; push tokens refreshed upon reconnect.

---

### 2.9 Driver Profile & Digital Documents (`/profile`)
- **Purpose**: Store legal transport documentation, driver credentials, and vehicle fitness certificates for military and police checkpoints.
- **Key UI Elements**:
  - Driver Photo & National ID details.
  - Commercial Driving License card with expiry indicator.
  - Vehicle Registration Certificate (RC) & Mountain Fitness Permit.
  - Total Kilometers Driven in NER and Safety Score badge.
- **Primary Action**: `Display Checkpoint QR Code`.
- **Offline Behavior**: All digital document scans stored in encrypted local storage; fully accessible without network.

---

### 2.10 Offline Synchronization Outbox (`/sync`)
- **Purpose**: Transparent visibility into pending offline items awaiting upload.
- **Key UI Elements**:
  - Connection Status Banner: `Connected (4G)` or `Offline (No Cellular Signal)`.
  - Queue Counter: "7 items waiting to sync (4 GPS Pings, 2 Checkpoint Clearances, 1 Incident Report)".
  - Sync Progress Bar: Visual progress during batch upload upon reconnection.
  - Manual `Force Sync Now` button.
- **Primary Action**: `Retry Failed Sync Items`.
- **Offline Behavior**: Dedicated offline diagnostics screen.
