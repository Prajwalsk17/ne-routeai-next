# AuraNER / NER-Route AI — Shipments & Trips Management Specification

This document details the production domain architecture, REST API catalog, security controls, lifecycle state machines, and UI specifications for the **Shipment Consignment** and **Trip Itinerary** subsystems of the **AuraNER / NER-Route AI** platform.

---

## 1. Domain Models & Enterprise Architecture

The Shipments and Trips subsystems model freight consignments, multi-SKU manifests, cold-chain regulatory bounds, and multi-stop vehicle/driver journey plans across the Northeast India terrain.

### 1.1 Shipments (`Shipment`)
Represents an organization's freight consignment traveling between facilities, hubs, or emergency relief camps:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique consignment identifier (e.g., `shp-178983...`) |
| `organizationId` | `string` | Tenant organization ownership identifier (Phase 6 isolation) |
| `shipmentCode` | `string` | Human-readable tracking code (e.g. `SHP-8192`) |
| `originFacilityId` | `string` | Origin depot, warehouse, or transit hub ID |
| `destinationFacilityId` | `string` | Destination facility or relief node ID |
| `cargoClassification` | `CargoClassification` | `GENERAL_FREIGHT`, `PERISHABLE`, `PHARMACEUTICAL`, `HAZMAT`, `FRAGILE`, `LIVESTOCK`, `HEAVY_EQUIPMENT` |
| `priority` | `ShipmentPriority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (disaster relief priority) |
| `status` | `ShipmentStatus` | `DRAFT`, `PLANNED`, `ASSIGNED`, `DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `DELAYED`, `REROUTING`, `CANCELLED` |
| `totalWeightKg` | `number` | Total consignment payload in kilograms (auto-calculated from manifest) |
| `totalVolumeM3` | `number` | Total volume in cubic meters (auto-calculated from manifest) |
| `requiresColdChain` | `boolean` | Temperature-controlled cargo flag |
| `minTemperatureC` | `number \| null` | Minimum permissible cargo temperature in Celsius |
| `maxTemperatureC` | `number \| null` | Maximum permissible cargo temperature in Celsius |
| `scheduledDeparture` | `string \| null` | ISO timestamp of target dispatch time |
| `actualDeparture` | `string \| null` | ISO timestamp recorded upon vehicle dispatch |
| `deliveredAt` | `string \| null` | ISO timestamp recorded upon consignee delivery |
| `podSignatureUrl` | `string \| null` | Proof-of-delivery cryptographic signature or scan |
| `podPhotoUrl` | `string \| null` | Proof-of-delivery photographic confirmation |
| `assignedTripId` | `string \| null` | Bound trip ID |
| `assignedVehicleId` | `string \| null` | Bound vehicle ID |
| `assignedDriverId` | `string \| null` | Bound driver ID |
| `items` | `ShipmentItem[]` | Manifest line items (SKUs) |

### 1.2 Shipment Items / Manifest Lines (`ShipmentItem`)
Individual itemized cargo entries attached to a consignment:
- `sku`: Stock Keeping Unit or batch identification string.
- `description`: Item description (e.g., "Vaccine Vials 5ml", "Rice 50kg Bags").
- `quantity`: Number of units.
- `unitWeightKg`: Unit weight in kg.
- `unitVolumeM3`: Unit volume in m³.
- `isFragile`: Flag indicating fragile handling requirements.
- `isHazardous`: Flag indicating hazardous material (HAZMAT) compliance.

### 1.3 Trips (`Trip`)
Represents an active multi-stop journey planned for a specific vehicle and driver:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique journey identifier (e.g., `trip-178983...`) |
| `organizationId` | `string` | Tenant organization ownership identifier |
| `tripCode` | `string` | Human-readable journey code (e.g. `TRIP-4291`) |
| `vehicleId` | `string` | Bound physical vehicle |
| `driverId` | `string` | Bound commercial driver |
| `routeVersionId` | `string \| null` | Pinned route plan version |
| `status` | `TripStatus` | `SCHEDULED`, `EN_ROUTE`, `AT_STOP`, `COMPLETED`, `CANCELLED`, `EMERGENCY_HALT` |
| `scheduledStart` | `string` | Target trip commencement timestamp |
| `actualStart` | `string \| null` | Timestamp when trip transition to `EN_ROUTE` occurred |
| `completedAt` | `string \| null` | Timestamp when final stop was completed |
| `stops` | `TripStop[]` | Ordered itinerary stops |
| `assignedShipmentIds` | `string[]` | Consignments transported on this trip |

### 1.4 Trip Stops (`TripStop`)
Sequential milestones and waypoints along a journey:
- `facilityId`: Node or checkpoint ID.
- `stopOrder`: 1-based sequential sequence index ($1, 2, 3\dots$).
- `stopType`: `PICKUP`, `DELIVERY`, `CHECKPOINT`, `REST_STOP`, `SAFE_HAVEN`.
- `plannedArrival`: Scheduled arrival timestamp.
- `actualArrival`: Real-time milestone arrival timestamp.
- `actualDeparture`: Milestone departure timestamp.
- `isCompleted`: Boolean completion flag.

### 1.5 Trip Assignments (`TripAssignment`)
Immutable junction table establishing multi-consignment consolidation into trips:
- `tripId`: Trip reference.
- `shipmentId`: Consignment reference.
- `assignedBy`: User ID of dispatch operator.
- `assignedAt`: Timestamp of assignment.

---

## 2. REST API Catalog

All endpoints require session authentication and enforce tenant isolation.

### 2.1 Shipment Endpoints
| Method | Path | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/shipments/summary` | `shipments:read` | Live tenant-scoped consignment metrics |
| `GET` | `/api/v1/shipments` | `shipments:read` | List consignments with filters (`status`, `priority`, `cargo_classification`, `requires_cold_chain`, `search`) |
| `POST` | `/api/v1/shipments` | `shipments:create` | Register new shipment consignment with terrain & cold-chain parameters |
| `GET` | `/api/v1/shipments/[id]` | `shipments:read` | Retrieve single shipment manifest and details |
| `PATCH` | `/api/v1/shipments/[id]` | `shipments:update` | Update consignment status, priority, or lifecycle metadata |
| `DELETE` | `/api/v1/shipments/[id]` | `shipments:cancel` | Cancel consignment (records reason in audit log) |
| `GET` | `/api/v1/shipments/[id]/items` | `shipments:read` | List manifest line items for consignment |
| `POST` | `/api/v1/shipments/[id]/items` | `shipments:update` | Append new SKU line item to manifest (recalculates weight & volume) |

### 2.2 Trip Endpoints
| Method | Path | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/trips/summary` | `shipments:read` | Live tenant-scoped trip operational metrics |
| `GET` | `/api/v1/trips` | `shipments:read` | List trips with filters (`status`, `vehicle_id`, `driver_id`, `search`) |
| `POST` | `/api/v1/trips` | `shipments:dispatch` | Create trip itinerary with vehicle, driver, and stops |
| `GET` | `/api/v1/trips/[id]` | `shipments:read` | Retrieve single trip with stops and linked consignments |
| `PATCH` | `/api/v1/trips/[id]` | `shipments:dispatch` | Update trip status (`EN_ROUTE`, `COMPLETED`, `CANCELLED`) |
| `GET` | `/api/v1/trips/[id]/stops` | `shipments:read` | List stops for trip |
| `POST` | `/api/v1/trips/[id]/stops` | `shipments:dispatch` | Append new waypoint or drop stop |
| `POST` | `/api/v1/trips/[id]/assign` | `shipments:dispatch` | Assign shipment consignment to trip |

---

## 3. RBAC Permissions Matrix

| Role | `shipments:read` | `shipments:create` | `shipments:update` | `shipments:dispatch` | `shipments:cancel` |
|---|:---:|:---:|:---:|:---:|:---:|
| **SUPER_ADMIN** | ✅ Global | ✅ Global | ✅ Global | ✅ Global | ✅ Global |
| **ORG_ADMIN** | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant |
| **LOGISTICS_MANAGER** | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant |
| **DISPATCHER** | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant |
| **DRIVER** | ✅ Assigned | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **VIEWER** | ✅ Tenant | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |

---

## 4. Multi-Tenant Isolation & Zero-Fabrication Invariants

1. **Strict Organization Scoping**: All database and in-memory queries filter strictly by `organizationId`. A user from `org_assam_civil_supplies` cannot view, search, modify, or cancel consignments belonging to `org_meghalaya_civil_supplies`. Cross-tenant HTTP attempts receive `403 Forbidden` or `404 Not Found`.
2. **Zero-Fabrication Policy**: Initialized tenants start with exactly 0 shipments, 0 items, and 0 trips. All summary counters return 0. The platform never seeds or fabricates mock consignments in production.
3. **Auditability**: All critical lifecycle operations (`createShipment`, `updateShipment`, `cancelShipment`, `addShipmentItem`, `createTrip`, `updateTripStatus`, `completeTripStop`, `assignShipmentToTrip`) record immutable entries in the audit registry with actor ID, timestamp, and metadata diffs.
