# AuraNER / NER-Route AI — System Requirements Specification

## 1. Vision & Operational Scope

**NER-Route AI** is a production-grade AI Smart Logistics & Accessibility Intelligence Platform engineered specifically for the extreme geographical, infrastructural, and meteorological conditions of India's **North Eastern Region (NER)**—encompassing Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, and Sikkim.

The platform bridges supply chain vulnerabilities caused by high mountain gradients, active landslide corridors, heavy monsoon flooding, single-lane highway chokepoints, and intermittent telecommunications connectivity.

---

## 2. Target Web Platform Requirements (Next.js / TypeScript / React)

The web platform is designed for logistics dispatchers, fleet managers, disaster management officers (NDRF/SDMA), and executive authorities.

### 2.1 Module Specifications

#### 2.1.1 Authentication & Profile
- Multi-factor authentication supporting Firebase Authentication (Email/Password, Phone OTP, Enterprise SSO).
- Session preservation via secure HTTP-only cookies.
- Passwordless login, session expiration management, and profile self-service.

#### 2.1.2 Dashboard (Command Center)
- Real-time KPI summaries: Total Active Shipments, Vehicles in Transit, High-Risk Incidents Detected, Safe Havens Reached, Average Transit Delay.
- Unified split-screen view: Geospatial operational radar on the left, live situational feed and alert triage on the right.
- Real-time updates delivered via WebSockets or Server-Sent Events (SSE).

#### 2.1.3 Fleet Management
- Comprehensive registry of vehicles: registration number, vehicle class (`LIGHT_VAN`, `MINI_TRUCK`, `MEDIUM_TRUCK`, `HEAVY_TRUCK`, `UTILITY_4X4`, `OFFROAD_VEHICLE`, `REFRIGERATED_TRUCK`, `BOAT`, `ROPEWAY_CARGO`).
- Physical vehicle capabilities: max payload capacity (kg), cargo volume ($m^3$), maximum gradient climbing ability (%), maximum road width ($m$), water-fording depth ($mm$), refrigeration capability.
- Telematics status: GPS ping freshness, battery/fuel level, maintenance odometer, current assigned driver.

#### 2.1.4 Driver Management
- Driver roster with contact details, licensing authority, medical certifications, driving record in mountainous terrain, and assigned organization.
- Shift management, duty status (`OFF_DUTY`, `STANDBY`, `ON_TRIP`, `RESTING`), and HOS (Hours of Service) compliance tracking.
- Direct driver broadcast communication and emergency check-in status.

#### 2.1.5 Shipment Management
- Lifecycle tracking through finite state machine: `DRAFT` → `PLANNED` → `ASSIGNED` → `DISPATCHED` → `IN_TRANSIT` → `DELAYED` → `REROUTING` → `DELIVERED` → `CANCELLED`.
- Cargo classification: General Freight, Medical Vaccines & Pharmaceuticals (Cold-Chain), Essential Food Supplies (PDS), Hazardous Materials, Disaster Relief Kits.
- Multi-item manifest details: SKU, quantity, weight, dimensions, fragile flags, temperature thresholds ($2^\circ\text{C}$ to $8^\circ\text{C}$).
- Proof of Delivery (POD) generation with digital signature and photo capture records.

#### 2.1.6 Trip & Dispatch Operations
- Multi-stop trip dispatching binding vehicles, drivers, route segments, and shipments.
- Intelligent dispatch wizard: automated matching of vehicle terrain capabilities against route gradient and road width profiles.
- One-click emergency reroute authorization and dispatch override.

#### 2.1.7 Routes & Topology Analysis
- Road network calculation with multi-criteria optimization: fastest path vs. safest terrain path vs. lowest flood exposure path.
- Longitudinal elevation profiling: total elevation gain ($m$), maximum incline gradient (%), and descent brake-wear risk.
- Infrastructure tagging: Border Roads Organisation (BRO) maintenance status, single-lane chokepoints, seasonal pontoon bridges, and Bailey bridge weight limits.

#### 2.1.8 Live Map (GIS Radar)
- Hardware-accelerated vector map engine powered by MapLibre GL.
- Configurable GIS layers: Active Fleet, Route Trajectories, Incident Buffer Zones (1km, 5km, 10km), Safe Havens (Hospitals, Police Posts, Fuel Depots, Relief Camps), Meteorological Radar Overlays.
- Dynamic camera tracking: focus on vehicle, auto-center on alert, 3D pitch/bearing rotation along the mountain ridge.

#### 2.1.9 Risk & Alerts Engine
- Dynamic risk scoring ($0-100$) derived from live weather, historical landslide susceptibility, seismic activity, and reported incidents.
- Advancing Hazard Proximity Detection: automatic alert trigger when a vehicle is $< 5\text{ km}$ from an active blockage.
- Multi-tier alert escalation: `DISPATCHER` $\to$ `LOGISTICS_MANAGER` $\to$ `STATE_DISASTER_CONTROL`.

#### 2.1.10 AI Intelligence & Copilot
- Natural language logistics copilot for querying fleet status, generating detour alternatives, and summarizing corridor disruptions.
- Predictive bottleneck detection based on historical weather patterns (e.g. Cherrapunji/Mawsynram rain radar).
- Autonomous reroute proposals generated by LangGraph multi-agent workflows with human-in-the-loop approval.

#### 2.1.11 Accessibility Intelligence
- Accessibility scoring for remote rural habitations and district headquarters across all 8 NER states.
- Multi-modal connectivity modeling: Road Highway $\to$ Rural Track $\to$ River Crossing (Brahmaputra Ferry) $\to$ Porter / Ropeway segment.
- Isolation Risk Index: calculation of days of remaining supply before a community becomes completely inaccessible during monsoon season.

#### 2.1.12 Analytics & Performance
- Historical corridor transit times vs. estimated transit times across mountain corridors (e.g. Guwahati-Silchar via Meghalaya, Dimapur-Kohima-Imphal).
- Fleet utilization rates, fuel efficiency in mountain ascents, and incident resolution times.

#### 2.1.13 Organization & Multi-Tenancy
- Multi-tenant tenant boundaries supporting logistics carriers, state civil supplies departments, NDRF battalions, and NGO relief networks.
- Tenant isolation: separate data workspaces, localized fleet pools, and private shipment manifests.

#### 2.1.14 Audit Logs & Compliance
- Tamper-evident, immutable audit trail of all security and dispatch actions (user logins, shipment dispatches, route overrides, incident acknowledgments).
- Structured schema capturing user ID, IP address, timestamp, action type, entity ID, previous state, and new state.

#### 2.1.15 System Settings
- Configurable alerts thresholds, mapping provider keys, weather sampling frequency, and notification preferences.

---

## 3. Target Mobile Platform Requirements (React Native / Expo)

The mobile platform is a purpose-built, high-reliability smartphone application for drivers operating in rugged terrain with intermittent connectivity.

### 3.1 Mobile Features

#### 3.1.1 Driver Authentication
- Fast, secure phone number OTP authentication via Firebase Auth with SMS fallback.
- Biometric authentication (Face Unlock / Fingerprint) for rapid wake-up at military checkpoints.
- Persistent offline token cache with cryptographically signed local credentials.

#### 3.1.2 Home Dashboard
- Immediate glanceable view of duty status, vehicle assignment, active trip summary, and urgent safety alerts.
- Offline status indicator showing local queue depth and sync freshness.

#### 3.1.3 My Trip
- Complete itinerary of the assigned trip: origin depot, intermediate checkpoints, delivery stops, and destination warehouse.
- Cargo handling guidelines and temperature alerts for cold-chain shipments.

#### 3.1.4 Turn-by-Turn Navigation
- Vector map navigation display optimized for high-contrast daylight and dark mountain night driving.
- Visual and audio alerts for upcoming hair-pin turns, severe gradients ($> 12\%$), and narrow single-lane bridges.
- Offline vector map tiles pre-cached for the active corridor prior to departure from base depot.

#### 3.1.5 Trip Status & Milestone Execution
- Driver check-in actions: Departure Confirmation, Checkpoint Clearance, Rest Break, Arrival at Stop, Successful Delivery.
- Electronic Proof of Delivery (e-POD): Recipient signature capture, cargo condition checklist, and geotagged delivery photo.

#### 3.1.6 Report Problem (Incident Ingestion)
- Instant roadside incident reporting: Landslide, Mudslip, Flash Flood, Road Block / Protest, Bridge Damage, Accident, Fallen Tree.
- One-touch photo capture, automatic GPS tagging, estimated blockage severity, and offline report queueing.

#### 3.1.7 Emergency SOS Trigger
- Prominent, red SOS emergency button.
- Triggers immediate critical alert broadcast to Dispatch Command, nearest Police Post, and Disaster Control Room.
- Transmits emergency beacon with precise coordinates, vehicle telematics, and driver battery level.

#### 3.1.8 Push Notifications
- High-priority push notifications delivered via Firebase Cloud Messaging (FCM).
- Critical hazard alerts break through "Do Not Disturb" / silent modes on driver devices.

#### 3.1.9 Driver Profile & Documents
- Storage of digital driver license, vehicle registration certificate, commercial transport permit, and mountain driving clearance.

#### 3.1.10 Offline Synchronization Engine
- Local-first architecture (SQLite / WatermelonDB) storing active trip, cached route geometry, and incident reports.
- Bi-directional synchronization queue: pings, incident reports, and POD records created offline are stored locally and automatically pushed upon cellular signal restoration.
- Exponential backoff retry with idempotent transaction IDs to eliminate duplicate dispatches.

---

## 4. Role-Based Access Control (RBAC) Specification

The system defines 6 strict roles across the platform:

| Role Code | Role Name | Scope & Authority |
| :--- | :--- | :--- |
| `SUPER_ADMIN` | Platform Super Administrator | Global cross-tenant management, system configuration, provider management, global audit logs, tenant provisioning. |
| `ORG_ADMIN` | Organization Administrator | Manages organization users, vehicles, facilities, billing, settings, and internal team permissions. |
| `DISPATCHER` | Operations Dispatcher | Creates shipments, plans routes, assigns vehicles and drivers, monitors live radar, acknowledges alerts, triggers reroutes. |
| `LOGISTICS_MANAGER`| Logistics & Fleet Manager | Fleet lifecycle management, driver compliance, route template management, analytics review, escalations triage. |
| `DRIVER` | Field Transport Operator | Mobile app access only: views assigned trip, receives turn-by-turn guidance, sends GPS pings, reports incidents, triggers SOS, completes POD. |
| `VIEWER` | Read-Only Stakeholder | Read-only access to dashboard KPIs, shipment tracking, and public hazard advisories (e.g. government observers). |

### 4.1 Permission Mapping Matrix

| Permission Key | SUPER_ADMIN | ORG_ADMIN | DISPATCHER | LOGISTICS_MANAGER | DRIVER | VIEWER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `organizations:manage` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users:manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `fleet:manage` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `fleet:read` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `shipments:create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `shipments:dispatch`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `shipments:read` | ✅ | ✅ | ✅ | ✅ | Assigned | ✅ |
| `routes:calculate` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `routes:override` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `incidents:report` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `incidents:verify` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `alerts:acknowledge`| ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `telemetry:write` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `audit:read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance & Scalability
- **API Response Latency**: P95 $< 250\text{ ms}$ for standard CRUD; P95 $< 1,500\text{ ms}$ for multi-criteria route optimization.
- **Telemetry Throughput**: Capable of ingesting 10,000 GPS telemetry pings/sec with Redis stream buffering.
- **Vector Map Rendering**: 60 FPS smooth rendering on modern mobile and desktop clients with MapLibre GL.

### 5.2 Availability & Resilience
- **Platform Availability**: 99.9% uptime SLA for core dispatch and alerting APIs.
- **Circuit Breaker**: Outbound provider calls (routing, weather, geocoding) fail fast with automatic failover to cached local GIS databases within 500ms.

### 5.3 Low-Bandwidth & Offline Capabilities
- Driver mobile app functional without active data connection for up to 72 hours using cached route geometry and local SQLite database.
- Telemetry payload minification: binary/compact JSON pings $< 200\text{ bytes}$ per transmission.

### 5.4 Security & Compliance
- All data in transit encrypted via TLS 1.3.
- All sensitive PII (driver license numbers, national ID numbers) encrypted at rest using AES-256.
- Full compliance with India's **Digital Personal Data Protection Act (DPDP Act 2023)**.
- Data residency: All primary database clusters, backups, and object storage buckets hosted within Indian data regions (e.g. Azure Central India / AWS Mumbai / GCP Delhi).
