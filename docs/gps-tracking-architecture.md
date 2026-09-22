# Phase 12 Architecture Specification: GPS & Real-Time Tracking

**Version:** 1.0.0  
**Phase:** 12 — GPS + Real-Time Telemetry Tracking  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Architectural Principles

The GPS & Real-Time Tracking architecture for **AuraNER / NER-RouteAI** establishes production-grade telemetry ingestion, high-frequency location capture for drivers in mountainous terrain, and low-latency live dispatch map visualization.

### Core Architectural Invariants:
1. **Zero-Fabrication Invariant**: Under no circumstance does the production platform manufacture simulated coordinates, synthetic standing positions (e.g. defaulting to Guwahati), or fake fleet pings when GPS hardware or drivers are offline. If an organization or vehicle has no live telemetry, the API returns truthful `null` or empty arrays with accurate `OFFLINE` status indicators.
2. **Driver Privacy & Duty Gating**: Driver GPS capture is strictly restricted to active duty and dispatched trips (`startTripTracking({ vehicleId, tripId })`). Tracking deactivates immediately when navigation ends or the driver goes off duty.
3. **Multi-Tenant Boundary Enforcement**: Telemetry pings are validated to ensure the vehicle, trip, and driver belong to the caller's organization. Cross-organization position queries return `null`/`OFFLINE` without leaking coordinates.
4. **Temporal Freshness Classification**: Every telemetry point is dynamically classified based on elapsed age:
   - `LIVE`: Elapsed time $< 30$ seconds.
   - `DEGRADED`: Elapsed time $30$ to $120$ seconds.
   - `STALE`: Elapsed time $120$ to $600$ seconds.
   - `OFFLINE`: Elapsed time $> 600$ seconds or no telemetry recorded.
5. **Offline Outbox Queuing**: In intermittent Himalayan mountain passes, in-cab mobile devices queue failed telemetry pings in an outbox buffer (`OutboxItemType: 'GPS_PING'`) and flush in chronological batches (`/api/v1/telemetry`) once connectivity resumes.

---

## 2. Telemetry Domain Models (`src/lib/types/telemetry.ts`)

```typescript
export type GpsFreshnessStatus = 'LIVE' | 'DEGRADED' | 'STALE' | 'OFFLINE';

export type GpsConnectionState =
  | 'STREAMING'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'PERMISSION_DENIED'
  | 'HARDWARE_UNAVAILABLE';

export interface GpsPosition {
  id: string;
  vehicleId: string;
  tripId?: string | null;
  driverId?: string | null;
  organizationId: string;
  coordinates: { lat: number; lng: number };
  speedKmh: number;
  headingDegrees: number;
  altitudeMeters?: number | null;
  accuracyMeters?: number | null;
  batteryPct?: number | null;
  isOfflineCached?: boolean;
  recordedAt: string; // ISO 8601 UTC
  createdAt: string;
}

export interface GpsVehicleState {
  vehicleId: string;
  registrationNumber: string;
  makeModel?: string;
  vehicleType?: string;
  organizationId: string;
  driverId?: string | null;
  driverName?: string | null;
  tripId?: string | null;
  tripCode?: string | null;
  latestPosition: GpsPosition | null;
  freshness: GpsFreshnessStatus;
  staleDurationSeconds: number;
  lastHeartbeatAt?: string | null;
}
```

---

## 3. Backend Telemetry Domain Service (`src/lib/services/telemetry.service.ts`)

- **`ingestGpsPosition(organizationId, input, user)`**:
  - Validates coordinate bounds: latitude ($-90$ to $90$), longitude ($-180$ to $180$), speed ($\ge 0$).
  - Validates temporal bounds: rejects future timestamps $> 5$ minutes in future and ancient timestamps $> 7$ days.
  - Enforces tenant ownership of vehicle and associated trip.
  - Automatically advances trip from `SCHEDULED`/`DISPATCHED` to `EN_ROUTE` and linked shipments to `IN_TRANSIT`.
  - Emits real-time notification to pub-sub event bus.
- **`ingestGpsBatch(organizationId, positions, user)`**:
  - Ingests chronological outbox queue payloads from mobile clients with batch error isolation.
- **`getLatestVehicleGps(vehicleId, organizationId)`**:
  - Returns latest verified point and computed freshness status. Zero fabrication.
- **`listLiveFleetGps(organizationId, options)`**:
  - Lists all tenant vehicles with their latest positions and freshness status.
- **`subscribeToTelemetry(organizationId, listener)`**:
  - Pub-sub subscription mechanism powering Server-Sent Events (SSE).

---

## 4. REST API & Streaming Endpoints

| Method | Route | Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/telemetry` | `telemetry:write` | Ingests single position or batch outbox array. |
| `GET` | `/api/v1/telemetry` | `telemetry:read` | Returns organization fleet state, or vehicle position / breadcrumb history. |
| `GET` | `/api/v1/telemetry/stream` | `telemetry:read` | Server-Sent Events (SSE) live position stream for dispatch radar. |

---

## 5. Driver Mobile Tracking Engine (`mobile/src/services/gps.service.ts`)

- **Permission Lifecycle**: `requestLocationPermissions()` checks platform location capabilities and updates state (`GRANTED`, `DENIED`, `UNDETERMINED`).
- **High-Accuracy Capture**: Collects latitude, longitude, altitude, accuracy meters, heading, and speed in KM/H.
- **In-Cab Signal Quality Assessment**: Computes signal strength (`EXCELLENT` $\le 5$m, `GOOD` $\le 15$m, `DEGRADED` $\le 40$m, `LOST`).
- **Offline Outbox Buffering**: Queues failed pings up to `MOBILE_CONFIG.maxQueuedItems` (500) and automatically flushes when online.
- **UI HUD Integration**: `NavigationScreen.tsx` provides live speedometer, altitude ASL, bearing, live coordinate card, and signal quality pills.

---

## 6. Live Dispatch Map Updates (`src/app/(app)/dispatch/page.tsx`)

- **Real Vehicle Binding**: `mapVehicles` is generated dynamically from live `/api/v1/telemetry` records.
- **Freshness Styling**:
  - Green ring (`#2DD4BF`) for `LIVE`.
  - Amber ring (`#F59E0B`) for `DEGRADED`.
  - Orange ring (`#F97316`) for `STALE`.
  - Slate ring (`#64748B`) for `OFFLINE`.
- **Accurate Popups**: Displays vehicle plate, speed, bearing, signal status, and accuracy radius ($\pm X$ m).
- **Truthful Empty State**: If no vehicles have transmitted telemetry, no fake vehicles are shown.

---

## 7. Verification Summary

| Category | Target | Actual | Status |
|---|---|---|---|
| Vitest GPS & Telemetry Tests | 18 tests | 18 passed | PASS |
| Vitest Full Regression | 165 tests | 165 passed | PASS |
| Web TypeScript Compilation | 0 errors | 0 errors | PASS |
| Mobile TypeScript Compilation | 0 errors | 0 errors | PASS |
| Next.js Static & API Build | 43 pages | 43 pages generated | PASS |
