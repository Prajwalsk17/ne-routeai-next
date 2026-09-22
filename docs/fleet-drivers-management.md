# AuraNER / NER-Route AI — Fleet & Driver Management Specification

This document details the production architecture, domain model, REST API catalog, security controls, and UI specifications for the **Fleet Management** and **Driver Roster** subsystems of the **AuraNER / NER-Route AI** platform.

---

## 1. Domain Models & Enterprise Architecture

The Fleet and Driver subsystems manage physical vehicle assets, mountain road operating parameters, regulatory documents, maintenance cycles, and driver personnel records.

### 1.1 Vehicles (`Vehicle`)
Vehicles are physical transport units configured for North Eastern Region (NER) terrain obstacles (steep mountain inclines, narrow single-lane roads, and monsoon river fordings):

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g., `veh-178983...`) |
| `organizationId` | `string` | Tenant organization ownership identifier |
| `facilityId` | `string \| null` | Base depot / warehouse hub |
| `registrationNumber` | `string` | Unique registration number (e.g. `AS-01-AX-1010`) |
| `makeModel` | `string` | Manufacturer and model (e.g. `Tata 407 Gold 4x4`) |
| `type` | `VehicleType` | `UTILITY_4X4`, `MINI_TRUCK`, `MEDIUM_TRUCK`, `HEAVY_TRUCK`, `REFRIGERATED_TRUCK`, `LIGHT_VAN`, `BOAT` |
| `payloadCapacityKg` | `number` | Maximum cargo weight payload in kilograms |
| `cargoVolumeM3` | `number` | Cargo box volume in cubic meters |
| `maxGradientPct` | `number` | Maximum mountain road gradient climbing ability ($15\% - 35\%$) |
| `maxWidthMeters` | `number` | Vehicle width in meters (critical for single-lane passes) |
| `waterCrossingDepthMm`| `number` | Water fording depth in millimeters for flash floods |
| `hasColdChain` | `boolean` | Temperature-controlled insulated box ($2^\circ\text{C} - 8^\circ\text{C}$) |
| `fuelType` | `string` | `DIESEL`, `EV`, `PETROL`, `CNG` |
| `currentFuelPct` | `number` | Current fuel tank percentage ($0 - 100\%$) |
| `status` | `VehicleStatus` | `AVAILABLE`, `ASSIGNED`, `IN_TRANSIT`, `MAINTENANCE`, `OFFLINE` |
| `isArchived` | `boolean` | Soft-deletion flag preserving audit and dispatch history |

### 1.2 Vehicle Compliance Documents (`VehicleDocument`)
Regulatory records required by regional transport authorities and mountain district administrations:
- `REGISTRATION_CERTIFICATE`: Vehicle Registration Certificate (RC).
- `FITNESS_CERTIFICATE`: Annual commercial roadworthiness inspection certificate.
- `MOUNTAIN_PERMIT`: Special clearance for high-altitude passes (e.g., Sela Pass, Nathu La corridor).
- `INSURANCE`: Commercial carrier goods and chassis insurance policy.

### 1.3 Vehicle Maintenance Logs (`VehicleMaintenance`)
Preventive and corrective maintenance events tracking mountain road wear:
- `ROUTINE_SERVICE`: Scheduled oil, filter, and fluids change.
- `BRAKE_OVERHAUL`: Mountain brake pads, discs, and air brake inspection.
- `SUSPENSION_MOUNTAIN`: Leaf spring, shock absorber, and chassis reinforcement.
- `TIRE_ROTATION`: Mud-and-snow traction tire tread monitoring.
- `EMERGERING_REPAIR`: Breakdown repair log.

### 1.4 Drivers (`Driver`)
Personnel operating within the NER regional logistics network:
- Contact details: Name, Indian mobile number (`+91` 10 digits), optional email.
- Commercial license details and expiration.
- `mountainExperienceYears`: Verified driving experience in difficult Himalayan and hill terrain.
- `dutyStatus`: `AVAILABLE`, `ON_TRIP`, `RESTING` (mandatory Hours of Service rest), `OFF_DUTY`.
- `safetyScore`: Dynamic driving score ($0 - 100$) derived from trip history and telematics.

### 1.5 Driver Certifications (`DriverDocument`)
- `COMMERCIAL_LICENSE`: Valid Heavy/Medium Commercial Vehicle license.
- `MOUNTAIN_HILL_ENDORSEMENT`: State RTO endorsement for driving on hill roads.
- `MEDICAL_FITNESS`: Annual health, vision, and high-altitude medical fitness.
- `POLICE_VERIFICATION`: Regional administration security verification.

---

## 2. REST API Catalog

All endpoints require session authentication and enforce tenant isolation.

### 2.1 Fleet Endpoints
| Method | Path | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/fleet/summary` | `fleet:read` | Live tenant-scoped fleet KPI metrics |
| `GET` | `/api/v1/fleet/vehicles` | `fleet:read` | List vehicles with filters (`status`, `type`, `search`, pagination) |
| `POST` | `/api/v1/fleet/vehicles` | `fleet:manage` | Register a new vehicle with terrain specs |
| `GET` | `/api/v1/fleet/vehicles/[id]` | `fleet:read` | Retrieve single vehicle details |
| `PATCH` | `/api/v1/fleet/vehicles/[id]` | `fleet:manage` | Update vehicle specifications or status |
| `DELETE` | `/api/v1/fleet/vehicles/[id]` | `fleet:manage` | Decommission / archive vehicle (soft-delete) |
| `GET` | `/api/v1/fleet/vehicles/[id]/documents` | `fleet:read` | List compliance documents for vehicle |
| `POST` | `/api/v1/fleet/vehicles/[id]/documents` | `fleet:manage` | Record new compliance document metadata |
| `GET` | `/api/v1/fleet/vehicles/[id]/maintenance` | `fleet:read` | List maintenance service records |
| `POST` | `/api/v1/fleet/vehicles/[id]/maintenance` | `fleet:manage` | Log new maintenance or service event |

### 2.2 Driver Endpoints
| Method | Path | Required Permission | Description |
|---|---|---|---|
| `GET` | `/api/v1/drivers/summary` | `drivers:read` | Live tenant-scoped driver roster metrics |
| `GET` | `/api/v1/drivers` | `drivers:read` | List drivers with filters (`duty_status`, `min_experience`, `search`) |
| `POST` | `/api/v1/drivers` | `drivers:manage` | Onboard a new driver with mountain experience |
| `GET` | `/api/v1/drivers/[id]` | `drivers:read` | Retrieve single driver profile |
| `PATCH` | `/api/v1/drivers/[id]` | `drivers:manage` | Update driver details, duty status, or vehicle |
| `DELETE` | `/api/v1/drivers/[id]` | `drivers:manage` | Suspend / archive driver record |
| `GET` | `/api/v1/drivers/[id]/documents` | `drivers:read` | List driver certifications and permits |
| `POST` | `/api/v1/drivers/[id]/documents` | `drivers:manage` | Record driver permit metadata |

---

## 3. RBAC Permissions Matrix

| Role | `fleet:read` | `fleet:manage` | `drivers:read` | `drivers:manage` |
|---|:---:|:---:|:---:|:---:|
| **SUPER_ADMIN** | ✅ Global | ✅ Global | ✅ Global | ✅ Global |
| **ORG_ADMIN** | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant |
| **LOGISTICS_MANAGER** | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ Tenant |
| **DISPATCHER** | ✅ Tenant | ❌ Denied | ✅ Tenant | ❌ Denied |
| **DRIVER** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied |
| **VIEWER** | ✅ Tenant | ❌ Denied | ❌ Denied | ❌ Denied |

---

## 4. Multi-Tenant Isolation & Zero-Fabrication

1. **Query Isolation**: All vehicle and driver queries automatically filter records by `user.organizationId` via [`tenant-scope.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/db/tenant-scope.ts). Users cannot inspect or mutate records from other organizations.
2. **Super Admin Cross-Tenant Visibility**: Super Admin users have global oversight across all NER states for disaster relief coordination.
3. **Zero-Fabrication Policy**:
   - Clean/empty organizations return exactly 0 records and KPI counters.
   - No mock or simulated vehicles or drivers are seeded or injected.
   - When no records exist, actionable empty states guide operators to register their first vehicle or onboard their first driver.

---

## 5. Audit Logging Integration

All asset lifecycle mutations produce structured, immutable audit log entries in `audit_logs` via [`audit.service.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/services/audit.service.ts):
- `VEHICLE_CREATED`: Logs registration number, vehicle type, and organization.
- `VEHICLE_UPDATED`: Records changed attributes (status, fuel level, specs).
- `VEHICLE_ARCHIVED`: Documents decommissioning reason.
- `VEHICLE_DOCUMENT_RECORDED`: Records compliance document number, type, and expiration.
- `VEHICLE_MAINTENANCE_LOGGED`: Logs service type, odometer reading, and cost.
- `DRIVER_ONBOARDED`: Records driver name, license number, and experience.
- `DRIVER_UPDATED`: Tracks duty status transitions (`AVAILABLE` $\leftrightarrow$ `RESTING` $\leftrightarrow$ `OFF_DUTY`).
- `DRIVER_ARCHIVED`: Documents driver suspension.
- `DRIVER_DOCUMENT_RECORDED`: Records mountain permit and license metadata.
