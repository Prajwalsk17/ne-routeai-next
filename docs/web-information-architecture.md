# AuraNER / NER-Route AI — Web Information Architecture (Owner Web Portal)

This document specifies the complete Information Architecture for the 14 core modules of the **Owner Web Portal** (Next.js 14 / TypeScript / React).

---

## 1. Dashboard (`/dashboard`)

- **Purpose**: Operational nerve center providing executive and tactical visibility into real-time fleet operations, active shipments, severe road hazards, and regional logistics KPIs across all 8 NER states.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`, `VIEWER`.
- **Navigation**: Top-level sidebar item `/dashboard`. Active by default upon login.
- **Information Hierarchy**:
  1. Top Alert Banner (if critical weather/landslide emergencies active).
  2. Operational Summary KPI Cards (Active Shipments, In-Transit Fleet, Critical Hazards, On-Time Rate).
  3. Split View: Left (Interactive MapLibre GIS Radar of active fleet & hazard zones) | Right (Real-time Alert Triage feed & Recent Dispatches).
  4. Regional Hub Status Summary table.
- **Primary Actions**:
  - `New Dispatch` (routes to `/dispatch/new`).
  - `Recalculate Route` (one-click emergency detour for threatened shipments).
- **Secondary Actions**:
  - `Filter Radar Layers`, `Acknowledge Alert`, `Export Daily Situational Report`.
- **Data Displays**:
  - 4 KPI Metric Cards with 24h change indicators.
  - Interactive MapLibre GL radar component with live vehicle markers and pulsing hazard radii.
  - Live Triage Alert List with severity chips and distance to hazard.
- **Filters**: Regional state filter (Assam, Meghalaya, etc.), Priority filter (Critical, High, All).
- **Search**: Global search bar across Shipment Tracking Codes and Vehicle Reg Numbers.
- **Pagination**: Real-time streaming list (infinite scroll for alerts; top 10 recent shipments with "View All" link).
- **Forms**: Quick Alert Acknowledgment inline form (action notes input).
- **Confirmation Flows**: "Confirm Immediate Detour" modal displaying ETA impact and detour coordinates.
- **Permissions**:
  - View: All roles.
  - Emergency Reroute / Triage: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: KPI card shimmer placeholders; map skeleton canvas with pulsing radar ring.
  - *Empty*: "No active dispatches. Click 'New Dispatch' to plan a shipment."
  - *Error*: "Failed to connect to real-time radar. [Retry Connection button]."
  - *Unavailable*: "Situational telemetry service temporarily unreachable. Falling back to cached state."
  - *Stale-Data*: Yellow top banner: "Displaying cached radar snapshot from 4m ago. [Refresh Now]."
  - *Offline*: "Network disconnected. Radar polling paused."

---

## 2. Fleet Management (`/fleet`)

- **Purpose**: Central asset registry managing vehicle physical capabilities, mountain gradient clearances, maintenance lifecycles, and real-time telematics.
- **Users**: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`, `DISPATCHER`.
- **Navigation**: Sidebar item `/fleet`.
- **Information Hierarchy**:
  1. Fleet Utilization KPIs (Total Fleet, Available, In-Transit, In-Shop).
  2. Filter & Search Action Bar.
  3. Comprehensive Fleet Data Table with vehicle specifications and assigned drivers.
  4. Vehicle Detail Slide-out Drawer (telematics, gradient rating, maintenance log).
- **Primary Actions**:
  - `Register Vehicle` (opens modal).
- **Secondary Actions**:
  - `Assign Driver`, `Schedule Maintenance`, `Download Compliance Certificate`.
- **Data Displays**:
  - 4 KPI Cards (Total Fleet, In Service, Maintenance Due, Fuel Efficiency).
  - Dense Data Table: Registration No, Vehicle Type, Payload (kg), Max Gradient (%), Width (m), Cold Chain (Yes/No), Status, Driver, Current Location.
- **Filters**: Vehicle Type (`UTILITY_4X4`, `REFRIGERATED_TRUCK`, etc.), Status (`AVAILABLE`, `IN_TRANSIT`, `MAINTENANCE`), State Hub.
- **Search**: Search by Reg Number or Assigned Driver Name.
- **Pagination**: Server-side pagination (25, 50, 100 items per page).
- **Forms**: Vehicle Registration Form: VIN, Type, Dimensions, Payload, Max Gradient %, Cold Chain specs.
- **Confirmation Flows**: "Decommission Vehicle" destructive confirmation dialog (requires typing reg number).
- **Permissions**:
  - Read: All roles.
  - Create/Update/Delete: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: 6-row table skeleton animation.
  - *Empty*: "No vehicles registered for this organization. [Register First Vehicle]."
  - *Error*: "Unable to load vehicle registry. [Try Again]."
  - *Unavailable*: "Fleet telematics provider offline."
  - *Stale-Data*: "Telemetry cached. Last GPS ping received 12m ago."
  - *Offline*: "Offline mode: viewing locally cached vehicle list."

---

## 3. Driver Management (`/drivers`)

- **Purpose**: Manage driver personnel, mountain road driving certifications, duty hours of service (HOS), assigned vehicles, and safety ratings.
- **Users**: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/drivers`.
- **Information Hierarchy**:
  1. Driver Operational Status Counters (On-Duty, Resting, In-Transit, Available).
  2. Driver Data Table with contact, license expiry, and mountain safety badges.
  3. Driver Profile Drawer with safety incident history and digital document viewer.
- **Primary Actions**:
  - `Onboard Driver` (opens modal wizard).
- **Secondary Actions**:
  - `Message Driver`, `Update License Docs`, `Log Rest Break`.
- **Data Displays**:
  - Driver Registry Table: Photo avatar, Name, Phone, License No, Experience Years in NER, Assigned Vehicle, HOS Status, Active Trip.
- **Filters**: Duty Status (`ON_DUTY`, `RESTING`, `OFF_DUTY`), Region/State, Certification Tier.
- **Search**: Search by Driver Name, Mobile Number, or License ID.
- **Pagination**: 20 items per page with page numbers.
- **Forms**: Driver Onboarding Form (Personal details, mobile phone for OTP, driving permit scan upload).
- **Confirmation Flows**: "Suspend Driver Duty Status" confirmation with required reason selection.
- **Permissions**:
  - Read: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
  - Edit/Onboard: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Grid skeleton with avatar placeholders.
  - *Empty*: "No drivers currently onboarded. [Add New Driver]."
  - *Error*: "Failed to retrieve driver roster. [Retry]."
  - *Unavailable*: "Identity directory service temporarily unreachable."
  - *Stale-Data*: "Driver duty status last updated at 18:30."
  - *Offline*: "Offline: driver actions disabled."

---

## 4. Shipment Management (`/shipments`)

- **Purpose**: Complete lifecycle management of cargo consignments, manifests, cold-chain tracking, and proof-of-delivery records.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`, `VIEWER`.
- **Navigation**: Sidebar item `/shipments`.
- **Information Hierarchy**:
  1. Shipment Lifecycle Tabs (`All`, `Planned`, `Dispatched`, `In Transit`, `Delivered`, `Delayed`).
  2. Filter Toolbar (Date range, Priority, Cold-chain).
  3. Consignment Data Table with multi-item expandable rows.
  4. Shipment Detail Modal: Manifest items, temperature history ($2-8^\circ\text{C}$), signed e-POD.
- **Primary Actions**:
  - `Create Shipment` (opens planning wizard `/dispatch/new`).
- **Secondary Actions**:
  - `Print Bill of Lading (BOL)`, `Track Live`, `Cancel Consignment`.
- **Data Displays**:
  - Data Table: Tracking Code, Origin, Destination, Cargo Classification, Weight, Priority Pill, Status Chip, Assigned Vehicle, ETA.
  - Temperature compliance sparkline for cold-chain consignments.
- **Filters**: Cargo Type (Vaccines, Relief, Food, Hazardous), Status, Priority (`CRITICAL`, `HIGH`, etc.).
- **Search**: Search by Tracking Code (`SHP-XXXX`) or Recipient Name.
- **Pagination**: 25 consignments per page.
- **Forms**: Create Shipment Form: Origin/Dest hubs, SKU lines, total weight, requires refrigeration checkbox.
- **Confirmation Flows**: "Cancel Shipment" modal warning that active fleet dispatch will be aborted.
- **Permissions**:
  - Read: All roles.
  - Create/Dispatch/Cancel: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Table skeleton with progress bars.
  - *Empty*: "No active shipments found matching the filters."
  - *Error*: "Failed to fetch shipment consignments."
  - *Unavailable*: "Shipment lifecycle database undergoing maintenance."
  - *Stale-Data*: "Displaying cached shipment list from 10m ago."
  - *Offline*: "Offline: view-only mode for cached shipments."

---

## 5. Trips & Dispatch Operations (`/trips`)

- **Purpose**: Multi-stop trip scheduling, driver-vehicle dispatch binding, milestone monitoring, and delivery route execution.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/trips`.
- **Information Hierarchy**:
  1. Active Trips Overview Kanban / List (`Scheduled`, `En Route`, `At Stop`, `Completed`).
  2. Trip Card / Table listing Origin, Intermediate Hubs, Destination, Vehicle, Driver, and Transit Progress bar.
  3. Stop-by-Stop Progress Timeline view with estimated vs actual arrival times.
- **Primary Actions**:
  - `Dispatch Trip` (initiates live trip and notifies driver).
- **Secondary Actions**:
  - `Add Intermediate Stop`, `Reassign Vehicle`, `Emergency Halt`.
- **Data Displays**:
  - Progress Timeline with color-coded stop nodes (Green: Cleared, Blue: In-Transit, Amber: Delayed).
  - Trip Detail Drawer with road segment checklist and checkpoint clearance records.
- **Filters**: Status, State Corridor (e.g. NH-29, NH-2, NH-10).
- **Search**: Search by Trip ID or Vehicle Reg.
- **Pagination**: 15 trips per page.
- **Forms**: Trip Scheduling Form: Ordered stops selection, cargo loading sequence, departure window.
- **Confirmation Flows**: "Confirm Trip Dispatch" modal with driver notification preview.
- **Permissions**:
  - Manage/Dispatch: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Skeleton cards with pulsing progress bars.
  - *Empty*: "No scheduled trips. Create a new dispatch from the command center."
  - *Error*: "Failed to load trip manifests."
  - *Unavailable*: "Trip management service currently unavailable."
  - *Stale-Data*: "Trip progress updated 5m ago."
  - *Offline*: "Cannot dispatch new trips while offline."

---

## 6. Routes & Terrain Intelligence (`/routes`)

- **Purpose**: Longitudinal elevation profiling, mountain road gradient analysis, bridge weight classification, and corridor comparison across the Northeast.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/routes`.
- **Information Hierarchy**:
  1. Corridor Selector (e.g., Guwahati to Kohima via Dimapur; Silchar to Aizawl).
  2. Split View: Left (Elevation Gain & Gradient Cross-Section Chart) | Right (Vector Road Geometry with Bridge Limits).
  3. Road Segment Condition Table (BRO clearance, surface quality, single-lane bottlenecks).
- **Primary Actions**:
  - `Calculate Alternative Route` (triggers multi-criteria routing).
- **Secondary Actions**:
  - `Export GPX/GeoJSON`, `Report Road Defect`, `Compare Profiles`.
- **Data Displays**:
  - Elevation Chart: Distance (x-axis, km) vs Altitude (y-axis, meters) with gradient heatmaps ($> 12\%$ marked in red).
  - Road Segment Table: Segment Name, Highway Code, Surface Type, Max Permitted Width, Max Tonnage, Risk Level.
- **Filters**: Terrain Type (`MOUNTAINOUS`, `HILLY`, `PLAIN`), Road Category (`ALL_WEATHER`, `4X4_ONLY`).
- **Search**: Search by Highway Number (e.g. "NH-29", "NH-10") or Town Name.
- **Pagination**: 20 segments per corridor.
- **Forms**: Custom Corridor Planning Form: Waypoint coordinate inputs, avoid tolls/ferry toggles.
- **Confirmation Flows**: "Apply Route Override" prompt when forcing transport over a restricted segment.
- **Permissions**:
  - Read: All roles.
  - Edit/Override: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Canvas wireframe skeleton with elevation axis placeholder.
  - *Empty*: "Select an origin and destination to generate terrain profile."
  - *Error*: "Failed to compute road elevation profile. [Retry Calculation]."
  - *Unavailable*: "Routing engine unreachable. Local offline road geometry in use."
  - *Stale-Data*: "Road condition scores based on yesterday's BRO bulletin."
  - *Offline*: "Offline: displaying cached static road network."

---

## 7. Live Map GIS Radar (`/dispatch` & Full Screen `/map`)

- **Purpose**: Real-time spatial situational awareness radar integrating live vehicle telemetry, active road hazards, weather overlays, and safe havens.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/dispatch` or icon trigger for Full-Screen Radar.
- **Information Hierarchy**:
  1. Floating GIS Layer Control Pill Bar (top left).
  2. Vehicle Rotation Marker with heading arrow and speed label.
  3. Red Hazard Zone Circles (with 1km, 5km buffer rings).
  4. Blue/Green Safe Haven Icons (Hospitals, Police, Fuel, Relief Camps).
  5. Selected Asset Floating Inspector Card (bottom right).
- **Primary Actions**:
  - `Focus on Active Vehicle`, `Trigger Immediate Detour Recalculation`.
- **Secondary Actions**:
  - `Toggle 3D Terrain Pitch`, `Locate Nearest Safe Haven`, `Filter Hazard Types`.
- **Data Displays**:
  - Full-viewport hardware-accelerated MapLibre GL vector canvas.
  - Vehicle telemetry callout: Speed, Altitude, Heading, Assigned Shipment, Driver.
  - Incident popup: Incident Type, Affected Radius, Confidence Score, Reported Time.
- **Filters**: Layer toggles (`Vehicles`, `Routes`, `Incidents`, `Safe Havens`, `Weather Radar`).
- **Search**: Quick-pan search bar for locations or vehicle call-signs.
- **Pagination**: N/A (continuous spatial viewport).
- **Forms**: Quick Incident Report modal directly from right-clicking a map coordinate.
- **Confirmation Flows**: "Confirm Reroute to Safe Haven" dialog with distance and emergency contact info.
- **Permissions**:
  - View: All roles.
  - Incident Creation / Detour: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Dark vector base with pulsing radar scan animation.
  - *Empty*: Vector map loaded with zero active fleet.
  - *Error*: "Map tile provider failed to respond. [Switch to OpenStreetMap Style]."
  - *Unavailable*: "Live vector tiles unavailable. Displaying raster fallback."
  - *Stale-Data*: "Telemetry connection paused. Data frozen as of 19:12."
  - *Offline*: "Offline: viewing pre-cached vector tile area."

---

## 8. Risk & Alerts Center (`/risk`)

- **Purpose**: Triage incoming landslide, flood, and meteorological hazards; track proximity warnings; escalate critical alerts to disaster control rooms.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/risk`.
- **Information Hierarchy**:
  1. Critical Active Alerts Drawer (items requiring immediate intervention).
  2. Regional Risk Map (state-by-state risk scores from 0-100).
  3. Incident Ingestion Feed with verification status (`UNVERIFIED`, `VERIFIED`, `RESOLVED`).
  4. Hazard History Table.
- **Primary Actions**:
  - `Acknowledge Alert`, `Broadcast Emergency Corridor Warning`.
- **Secondary Actions**:
  - `Verify Incident`, `Escalate to SDMA/NDRF`, `Mark Resolved`.
- **Data Displays**:
  - Risk Score Pill ($0-100$) with color-coded severity.
  - Hazard Table: Incident ID, Type, Location/Highway, Severity, Confidence (%), Reported By, Status, Actions.
- **Filters**: Severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), Status (`ACTIVE`, `RESOLVED`), Incident Type (`LANDSLIDE`, `FLOOD`, etc.).
- **Search**: Search by Highway Sector or Incident Title.
- **Pagination**: 20 alerts per page.
- **Forms**: Incident Verification Form: Confirmed affected radius (m), road impassable checkbox, estimated clearance time.
- **Confirmation Flows**: "Escalate to State Disaster Authority" high-impact modal.
- **Permissions**:
  - Acknowledge/Resolve: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Alert card skeleton pulses.
  - *Empty*: "No active hazards detected across the region. All corridors clear."
  - *Error*: "Failed to retrieve risk feed."
  - *Unavailable*: "Risk calculation engine undergoing maintenance."
  - *Stale-Data*: "Hazard warnings last synchronized 15m ago."
  - *Offline*: "Cannot receive live hazard broadcasts while offline."

---

## 9. AI Intelligence & Copilot (`/copilot`)

- **Purpose**: Natural language logistics assistant powered by multi-agent workflows (LangGraph); generates automated detour proposals, analyzes weather impacts, and summarizes supply chain bottlenecks.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/copilot` or slide-out drawer button on any screen.
- **Information Hierarchy**:
  1. Suggested Prompt Chips ("Recommend detour for SHP-1048", "Summarize NH-29 landslide risks", "Find available 4x4 vehicles in Tezpur").
  2. Conversational Message Stream (User messages vs AI Assistant).
  3. Structured AI Artifact Cards (Interactive route comparisons, vehicle recommendation tables, confidence scores).
  4. Context Inspector (Displays tools executed by the agent: `weather_query`, `cvrp_solver`, `spatial_buffer`).
- **Primary Actions**:
  - `Apply AI Recommendation` (transfers approved route to dispatch system).
- **Secondary Actions**:
  - `Regenerate Response`, `Inspect Agent Tool Calls`, `Copy Prompt`.
- **Data Displays**:
  - Markdown formatted responses with syntax-highlighted data tables.
  - Visual Detour Card with distance delta, ETA delta, and elevation cross-section.
- **Filters**: Context filters (Current Shipment, Current Corridor).
- **Search**: Search past Copilot conversations.
- **Pagination**: Infinite scroll message history.
- **Forms**: Natural language query input with audio voice input button.
- **Confirmation Flows**: "Apply AI Detour Proposal" modal requiring dispatcher authorization signature.
- **Permissions**:
  - Read/Chat: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Three pulsing purple dots ("AI Agent querying weather & solving constraints...").
  - *Empty*: Welcome state with suggested prompt cards and capabilities list.
  - *Error*: "AI service timed out while calculating optimal route. [Retry]."
  - *Unavailable*: "AI reasoning agent currently busy. Fall back to manual routing."
  - *Stale-Data*: "Notice: AI recommendation based on route state from 20m ago."
  - *Offline*: "AI Copilot requires an active internet connection."

---

## 10. Accessibility Intelligence (`/accessibility`)

- **Purpose**: Geospatial accessibility scoring for remote habitations, tribal settlements, and district headquarters across the Northeast; models seasonal valley isolation and multi-modal transit links (Road + Ferry + Porter).
- **Users**: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`, `VIEWER`.
- **Navigation**: Sidebar item `/accessibility`.
- **Information Hierarchy**:
  1. Regional Accessibility Index KPIs (Isolated Habitats, Fair-Weather Only Villages, Average Travel Time to District Hospital).
  2. Interactive Vulnerability Heatmap of the 8 states.
  3. Habitat Isolation Vulnerability Table.
  4. Multi-modal Corridor Journey Breakdown drawer.
- **Primary Actions**:
  - `Simulate Monsoon Impact` (adjusts rainfall slider to model severed bridges).
- **Secondary Actions**:
  - `Export District Accessibility Report`, `Flag Critical Healthcare Gap`.
- **Data Displays**:
  - Heatmap showing green/amber/red accessibility tiers across district blocks.
  - Habitats Table: Village Name, District, Population, Access Quality (`ALL_WEATHER`, `FAIR_WEATHER`, `4X4_ONLY`, `ISOLATED`), Days of Food Supply Remaining.
- **Filters**: State, Accessibility Tier, Hospital Distance Threshold ($> 4\text{ hours}$).
- **Search**: Search by Village / Settlement Name or District.
- **Pagination**: 25 settlements per page.
- **Forms**: Habitat Profile Update Form (updates bridge status and health facility capacity).
- **Confirmation Flows**: N/A (Analytical view).
- **Permissions**:
  - Read: All roles.
- **UI States**:
  - *Loading*: Heatmap skeleton loader with pulsing territory boundaries.
  - *Empty*: "No habitats match the selected isolation filter."
  - *Error*: "Failed to calculate regional accessibility index."
  - *Unavailable*: "Topographical accessibility service unreachable."
  - *Stale-Data*: "Accessibility indices calculated using seasonal baseline data."
  - *Offline*: "Offline: viewing cached accessibility index."

---

## 11. Analytics & Corridor Performance (`/analytics`)

- **Purpose**: Strategic performance analytics on transit durations, mountain corridor reliability, fuel consumption in steep ascents, and driver safety compliance.
- **Users**: `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`, `VIEWER`.
- **Navigation**: Sidebar item `/analytics`.
- **Information Hierarchy**:
  1. Date Range & Corridor Selector Bar.
  2. Primary Performance KPI Cards (Average Corridor Transit Delay, Planned vs Actual Duration, Fuel Efficiency, Disruption Count).
  3. Corridor Reliability Chart (transit time variance over the last 90 days).
  4. Bottleneck Chokepoint Frequency Chart (e.g., Zubza, Sonapur Tunnel, Barapani).
- **Primary Actions**:
  - `Export PDF Analytics Brief`, `Export CSV Raw Transit Data`.
- **Secondary Actions**:
  - `Change Aggregation Interval` (Daily, Weekly, Monthly), `Compare Corridors`.
- **Data Displays**:
  - Multi-line trend charts comparing predicted vs actual transit hours.
  - Bar chart of top 10 recurrent roadblock corridors.
- **Filters**: Date Range (Last 7D, 30D, 90D, Custom), Corridor, Fleet Type.
- **Search**: N/A.
- **Pagination**: Table views paginate at 20 rows.
- **Forms**: Custom Report Generation form.
- **Confirmation Flows**: N/A.
- **Permissions**:
  - Read: All roles.
- **UI States**:
  - *Loading*: Shimmer chart canvas with skeleton grid lines.
  - *Empty*: "Insufficient trip history for the selected date range."
  - *Error*: "Unable to aggregate analytics metrics."
  - *Unavailable*: "Analytics aggregation worker busy."
  - *Stale-Data*: "Metrics aggregated as of midnight today."
  - *Offline*: "Analytics unavailable offline."

---

## 12. Organization Management (`/organization`)

- **Purpose**: Multi-tenant workspace management, team member role provisioning, tenant facility configuration, and billing/subscription settings.
- **Users**: `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/organization` or profile menu dropdown.
- **Information Hierarchy**:
  1. Organization Profile Banner (Name, Code, Tenant ID, Organization Type).
  2. Member Roster Table with assigned roles and active status.
  3. Facilities & Base Depots Registry.
  4. Security Policies (MFA requirement toggle, session timeout).
- **Primary Actions**:
  - `Invite Team Member` (opens email/phone invitation modal).
- **Secondary Actions**:
  - `Edit Member Role`, `Revoke Access`, `Register New Depot Facility`.
- **Data Displays**:
  - Member Table: User Avatar, Full Name, Email, Role Chip, Last Active, Actions.
  - Facility Grid: Facility Name, State, Coordinates, Depot Capacity (Tons), Status.
- **Filters**: Role Filter (`DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER`), Status.
- **Search**: Search team members by name or email.
- **Pagination**: 15 members per page.
- **Forms**: Member Invitation Form: Email, Phone, Assigned Role, Depot Location restriction.
- **Confirmation Flows**: "Revoke Member Access" destructive confirmation dialog.
- **Permissions**:
  - Access: `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Team list skeleton with avatar rings.
  - *Empty*: "No other members invited to this organization."
  - *Error*: "Failed to retrieve organization member registry."
  - *Unavailable*: "Tenant provisioning service offline."
  - *Stale-Data*: "Team member last-active stamps cached."
  - *Offline*: "Organization management requires online connectivity."

---

## 13. Audit Logs & Security (`/audit`)

- **Purpose**: Tamper-evident, cryptographically chained audit trail of all security-sensitive operations (dispatches, route recalculations, manual overrides, logins, permission updates).
- **Users**: `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar item `/audit`.
- **Information Hierarchy**:
  1. Cryptographic Chain Integrity Indicator (e.g., "Chain Valid: 14,892 verified SHA-256 blocks").
  2. Filter & Date Range Bar.
  3. Audit Log Data Table.
  4. Log Detail Inspector Drawer displaying Previous State vs New State JSON diff and SHA-256 hashes.
- **Primary Actions**:
  - `Verify Audit Hash Chain` (executes cryptographic validation check).
- **Secondary Actions**:
  - `Export Cryptographic Audit Proof (JSON)`, `Filter by Actor`.
- **Data Displays**:
  - Audit Table: Timestamp, Actor (User), Action (`SHIPMENT_DISPATCHED`, `ROUTE_OVERRIDDEN`, etc.), Entity Type, Entity ID, IP Address, Verification Badge.
  - JSON State Diff viewer with color-coded additions/deletions.
- **Filters**: Action Type, Actor User, Entity Type, Date Range.
- **Search**: Search by Entity UUID or Actor Email.
- **Pagination**: 50 records per page.
- **Forms**: N/A (immutable log).
- **Confirmation Flows**: N/A.
- **Permissions**:
  - Read: `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Dense monospace row skeleton loaders.
  - *Empty*: "No audit events recorded for the specified criteria."
  - *Error*: "Failed to retrieve audit trail."
  - *Unavailable*: "Audit log cluster temporarily unreachable."
  - *Stale-Data*: "Audit log synchronized up to 2m ago."
  - *Offline*: "Cannot view audit logs offline."

---

## 14. System Settings (`/settings`)

- **Purpose**: System-wide configuration, mapping provider key management, notification channels, weather alert thresholds, and local device preferences.
- **Users**: `DISPATCHER`, `LOGISTICS_MANAGER`, `ORG_ADMIN`, `SUPER_ADMIN`.
- **Navigation**: Sidebar footer item `/settings`.
- **Information Hierarchy**:
  1. Navigation Tabs (`General`, `Mapping & GIS`, `Alert Thresholds`, `Notifications`, `Integrations`).
  2. Tab Content Panels with toggle controls, slider inputs, and key entry fields.
  3. Save & Reset Action Bar (sticky at bottom).
- **Primary Actions**:
  - `Save Settings` (persists updates).
- **Secondary Actions**:
  - `Reset to Recommended Defaults`, `Test Provider Connection`, `Clear Local Cache`.
- **Data Displays**:
  - Provider Status Cards (MapLibre: Active, Open-Meteo: Active, Firebase: Connected).
  - Hazard Threshold Slider: Hazard Warning Distance ($2\text{km} - 15\text{km}$, default $5\text{km}$).
- **Filters**: N/A.
- **Search**: Quick setting search filter.
- **Pagination**: N/A.
- **Forms**: Settings Form: API keys, webhook URLs, default notification sound, language preference.
- **Confirmation Flows**: "Clear Local GIS Tile Cache" confirmation dialog.
- **Permissions**:
  - User Preferences: All roles.
  - System Keys / Thresholds: `ORG_ADMIN`, `SUPER_ADMIN`.
- **UI States**:
  - *Loading*: Form input skeletons.
  - *Empty*: N/A.
  - *Error*: "Failed to load system preferences."
  - *Unavailable*: "Configuration service currently unreachable."
  - *Stale-Data*: "Displaying cached settings."
  - *Offline*: "Settings changes cannot be saved while offline."
