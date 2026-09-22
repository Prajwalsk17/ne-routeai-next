# Surgical Map Transportation Route Fix Report

**Document Reference**: `docs/MAP-TRANSPORTATION-ROUTE-FIX-REPORT.md`  
**Classification**: Production Systems, Routing & Map Architecture Audit  
**Date**: September 22, 2026  
**Final Status**: **ROUTE_FIXED_AND_VERIFIED**

---

## 1. Existing Routing Provider

The primary routing provider configured in the application is the **Open Source Routing Machine (OSRM)** OpenStreetMap Engine, implemented via:
- `OsrmRoutingService` in `src/lib/routing/providers/osrm-routing.provider.ts`
- `OsrmRoutingProvider` in `src/lib/providers/routing.provider.ts`
- Base URL configured from environment: `env.ROUTING_BASE_URL || 'http://router.project-osrm.org'`

The routing provider connects to the OSRM `/route/v1/driving` API with query options `overview=full&geometries=geojson&steps=true&annotations=distance,duration`.

---

## 2. Existing Map Provider

The primary interactive map provider across operational dashboards (`/dispatch`, `/routes`, `/driver`, `/risk`, `/dispatch/new`) is **MapLibre GL** (`maplibre-gl` v4.7.1) implemented in `src/components/DispatchMap.tsx`.
- Vector and raster tiles: Esri Canvas Dark Gray Base, Esri World Imagery (Satellite), and OpenStreetMap (Streets).
- Overview reference map: Leaflet (`react-leaflet` v4.2.1) in `src/components/MapView.tsx` for static node distribution.

---

## 3. Route API Used

- **Route Calculation Endpoint**: `POST /api/v1/routes/plan`
  - Body: `{ origin_id, destination_id, vehicle_id, transport_mode, waypoints, avoid_coordinates, avoid_incidents }`
  - Validated by: `routeCalculationSchema` in `src/lib/validation/index.ts`
- **Dynamic Detour Recalculation Endpoint**: `POST /api/v1/routes/recalculate`
  - Body: `{ shipment_id, current_lat, current_lng, avoid_incident_id, reason }`
  - Invokes `recalculateSafeAlternative()` in `src/lib/services/recalculation.service.ts`

---

## 4. Geometry Format

- **GeoJSON LineString**: Geometry is returned by OSRM and the API as an array of coordinate pairs: `[number, number][]`.
- **Order Convention**: GeoJSON strictly uses `[longitude, latitude]`.
  - In Northeast India (latitudes ~21°N to ~30°N, longitudes ~88°E to ~97°E), the first element is longitude (~91.7) and the second element is latitude (~26.1).

---

## 5. Coordinate Conversion & Validation

`validateAndNormalizeCoordinates()` was implemented in `src/components/DispatchMap.tsx`:
1. Validates that every coordinate point contains finite numerical values.
2. Rejects out-of-range latitudes (`lat < -90 || lat > 90`) and longitudes (`lng < -180 || lng > 180`).
3. Rejects non-finite values (`NaN`, `Infinity`, null, undefined, malformed objects).
4. Automatically detects inverted `[latitude, longitude]` inputs (where latitude is ~20–35 and longitude is ~85–100) and safely normalizes them to GeoJSON `[longitude, latitude]`.
5. Safely extracts coordinates from object formats `{ lat, lng }` or `{ latitude, longitude }`.

---

## 6. Route Rendering Implementation

In `src/components/DispatchMap.tsx`:
1. **Style Readiness Guard**: Inspects `map.isStyleLoaded()`. If the style is not yet fully loaded during base style transitions (Dark &harr; Satellite &harr; Streets), defers layer addition using `map.once('style.load')` to eliminate MapLibre runtime exceptions.
2. **Layer Lifecycle**: Safely removes all existing route sources (`route-source-*`) and layers (`route-layer-*`, `route-glow-*`) before adding new geometry, preventing duplicate layers, flickering, or memory leaks.
3. **Dual Layer Vector Drawing**:
   - **Glow Layer**: A semi-transparent blurred ambient glow line (`line-width: 8`, `line-opacity: 0.35`, `line-blur: 3`).
   - **Core Vector Line**: Crisp vector line (`line-width: 5` for planned route, `line-width: 4` for alternatives, `line-width: 3.5` for GPS tracks).
4. **Origin (A) & Destination (B) Markers**: Point A (Emerald) and Point B (Amber) markers are placed at the exact start and end vertices of the primary planned road corridor.
5. **Viewport Bounds Fitting**: Automatically computes `maplibregl.LngLatBounds()` from all valid route vertices and invokes `map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 900 })`.

---

## 7. Distance Source

- Distance is extracted directly from the actual OSRM road-network result: `parseFloat((primary.distance / 1000).toFixed(1))`.
- Straight-line Haversine distance is **never** used to represent transportation route distance.

---

## 8. ETA Source

- Duration is extracted directly from the actual OSRM road-network result: `Math.round(primary.duration / 60)`.
- If terrain adjustments or vehicle profiles apply, duration accounts for highway sector gradients and mountain speed factors.
- No hardcoded durations or synthetic traffic claims.

---

## 9. Multi-Stop Behavior & Waypoints

1. `RouteCalculationConstraints` in `src/lib/routing/types.ts` was extended with `waypoints?: Coordinates[]`.
2. `routeCalculationSchema` in `src/lib/validation/index.ts` was updated to accept `waypoints: z.array(coordinatePointSchema).optional()`.
3. `OsrmRoutingService.calculateRoute()` formats all ordered stops into the OSRM query string:  
   `{origin};{waypoint1};{waypoint2};...;{avoidanceDetours};{destination}`
4. The resulting transportation route follows the ordered highway corridor connecting all stops consecutively along real roads.

---

## 10. Planned Route vs Actual GPS Track Distinction

To prevent confusing the planned route with live tracking:
1. `DispatchMapRoute` defines `isGpsTrack?: boolean`.
2. **Planned Road Route** (`isGpsTrack: false` or omitted):
   - Solid orchid (`#A855F7`) or emerald (`#10B981`) line.
   - Core width 5px with ambient glow.
   - Origin (Point A) and Destination (Point B) markers.
   - Label: `Planned Road Route: [Origin] → [Destination]`.
3. **Actual GPS Track** (`isGpsTrack: true`):
   - Cyan (`#06B6D4`) dotted/dashed telemetry track (`line-dasharray: [2, 2]`, width 3.5px).
   - Rendered strictly from live vehicle telemetry breadcrumb history (`telemetryList[].breadcrumbHistory` or driver `gpsBreadcrumbs`).
   - Distinct legend item: "Actual GPS Track".
   - Never substitutes or masquerades as the planned road route.

---

## 11. Error Handling (Zero Fake Route Invariant)

1. If OSRM or the routing provider is unreachable or returns code !== 'Ok':
   - `OsrmRoutingService` throws structured errors: `RouteNotFoundError`, `ProviderUnavailableError`, or `ProviderTimeoutError`.
   - `POST /api/v1/routes/plan` returns HTTP 404/503 with `{ success: false, error: { message: ... } }`.
   - UI views (`dispatch/page.tsx`, `routes/page.tsx`, `driver/page.tsx`) display a clear "Route unavailable" indicator.
   - **No fake straight line, no random coordinate array, and no placeholder line is rendered.**

---

## 12. Performance & Lifecycle Improvements

1. Eliminated layer and source leaks by checking `map.getLayer()` and `map.getSource()` before deletion and creation.
2. Eliminated `Style is not done loading` race conditions during tile switcher changes by verifying `map.isStyleLoaded()`.
3. Replaced static hardcoded dummy coordinate arrays in `dispatch/page.tsx` and `driver/page.tsx` with dynamic road-geometry fetching tied to the active shipment lifecycle.
4. Prevented duplicate API calls by mounting fetch cancellations with `isMounted` checks.

---

## 13. Tests Performed

### 1. Automated Vitest Suite: `src/lib/test/map-transportation-route.test.ts`
- **13/13 tests passed** (4.2s runtime).
  - Validation of GeoJSON `[lng, lat]` coordinates.
  - Automatic detection and normalization of inverted `[lat, lng]` coordinates.
  - Rejection of out-of-range latitudes and longitudes.
  - Rejection of non-finite values (NaN, Infinity).
  - Rejection of identical origin and destination (400 Bad Request).
  - Graceful rejection of unknown locations (404 Not Found).
  - Real road network geometry calculation with >10 vertices and positive distance/duration.
  - Waypoint schema validation for multi-stop journeys.
  - Structural and visual separation of Planned Route vs Actual GPS Track.

### 2. Full Regression Test Suite
- **37/37 test suites passed** (590/590 unit and integration tests passed).
- `scenario.test.ts`: 13/13 logistics pipeline steps passed.

### 3. TypeScript Typecheck
- `npm run typecheck`: **0 errors** (code 0).

### 4. Linter Check
- `npm run lint`: **0 errors** (code 0).

### 5. Production Build Validation
- `npm run build`: **45/45 static and dynamic pages compiled successfully** (code 0).

---

## 14. Files Changed

| File | Nature of Changes | Rationale |
| :--- | :--- | :--- |
| `src/components/DispatchMap.tsx` | Added `validateAndNormalizeCoordinates()`, `isGpsTrack` support, `map.isStyleLoaded()` guard, distinct GPS track rendering, and updated legend. | Guarantees coordinate order, prevents MapLibre crashes on style switch, and visually distinguishes planned corridors from vehicle GPS tracks. |
| `src/lib/routing/types.ts` | Added `waypoints?: Coordinates[]` to `RouteCalculationConstraints`. | Supports multi-stop and checkpoint routing along actual road corridors. |
| `src/lib/routing/providers/osrm-routing.provider.ts` | Sequenced intermediate waypoints into OSRM URL and enforced road-derived distance/duration. | Allows OSRM to route through ordered stops along the transportable road network. |
| `src/lib/validation/index.ts` | Added `waypoints` schema to `routeCalculationSchema`. | Validates multi-stop coordinates on API requests. |
| `src/app/api/v1/routes/plan/route.ts` | Forwarded `waypoints` to `calculateRoute`; provided both `route` and `routes` in response payload. | Satisfies client component contracts with verified road geometry. |
| `src/app/(app)/dispatch/page.tsx` | Replaced hardcoded 5-point dummy array with live road route calculation from `/api/v1/routes/plan` for selected/active shipment; added distinct vehicle GPS track support. | Eliminates fake routes in Dispatch Command Center and draws actual road network geometry for active shipments. |
| `src/app/driver/page.tsx` | Replaced hardcoded dummy points with live corridor road geometry and real detour geometry from `/api/v1/routes/recalculate`; recorded separate GPS telemetry track. | Displays true road route and distinguishes driver's live GPS breadcrumbs from planned highway corridor. |
| `src/app/(app)/dispatch/new/page.tsx` | Safeguarded planned route metric resolutions with fallback accessors. | Prevents property access errors across step transitions. |
| `src/lib/test/map-transportation-route.test.ts` | New comprehensive test suite (13 tests) validating coordinate order, road geometry, waypoints, error states, and GPS distinction. | Guarantees test coverage and regression protection. |

---

## 15. External Provider Requirements

- **OSRM Engine**: Live road calculation relies on `ROUTING_BASE_URL` (defaulting to OpenStreetMap public OSRM server `http://router.project-osrm.org` or a self-hosted OSRM container).
- When offline or during provider disruptions, the application fails truthfully with `Route unavailable` rather than rendering synthetic straight lines.

---

## Final Status

**ROUTE_FIXED_AND_VERIFIED**
