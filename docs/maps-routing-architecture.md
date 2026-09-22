# Phase 11 Architecture Specification: Maps & Routing Engine

**Version:** 1.0.0  
**Phase:** 11 — Maps + Routing Engine  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Architectural Principles

The Maps & Routing architecture for **AuraNER / NER-RouteAI** delivers production-grade geospatial routing, coordinate geocoding, and corridor persistence tailored for Northeast India's complex mountainous terrain.

### Core Architectural Invariants:
1. **Provider Abstraction**: All mapping and routing interactions are decoupled behind strict TypeScript interfaces (`RoutingService`, `GeocodingService`). The domain application is completely agnostic of whether routes are served by an on-premise OSRM cluster, Valhalla, OpenRouteService, or a cloud provider.
2. **Zero-Fabrication Policy**: Under no circumstance does the production routing service manufacture synthetic coordinates, sinusoidal polylines, or fake ETAs when external routing engines are offline or unreachable. If a provider fails, times out, or returns no valid corridor, the system fails cleanly with structured errors (`ProviderUnavailableError`, `ProviderTimeoutError`, `RouteNotFoundError`) and presents truthful error states to dispatchers.
3. **Northeast India Viewbox Bounding**: Reverse and forward geocoding queries prioritize and restrict results within the Northeast India bounding box (`[89.5, 21.8, 97.5, 29.5]`) covering Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura, and Sikkim.
4. **Route Provenance & Versioning**: Every calculated and persisted route captures immutable provenance metadata: provider identity, engine latency (ms), timestamp, checksums, and distance matrix metrics. When road conditions or infrastructure change, route corridors can be incremented via monotonic `route_versions` and ordered `route_segments`.

---

## 2. Interface Contracts

### 2.1 RoutingService (`src/lib/routing/types.ts`)

```typescript
export interface RoutingService {
  readonly providerName: string;

  calculateRoute(
    origin: GeoCoordinate,
    destination: GeoCoordinate,
    options?: RouteCalculationOptions
  ): Promise<RouteCalculationResult>;

  calculateDistanceMatrix(
    origins: GeoCoordinate[],
    destinations: GeoCoordinate[],
    options?: { signal?: AbortSignal }
  ): Promise<DistanceMatrixResult>;
}
```

### 2.2 GeocodingService (`src/lib/routing/types.ts`)

```typescript
export interface GeocodingService {
  readonly providerName: string;

  searchLocations(
    query: string,
    options?: { limit?: number; signal?: AbortSignal }
  ): Promise<GeocodedLocation[]>;

  reverseGeocode(
    coordinate: GeoCoordinate,
    options?: { signal?: AbortSignal }
  ): Promise<GeocodedLocation | null>;
}
```

---

## 3. Provider Implementations

### 3.1 OSRM Routing Provider (`src/lib/routing/providers/osrm-routing.provider.ts`)
- **Protocol**: HTTP/REST against Open Source Routing Machine (`/route/v1/driving/`, `/table/v1/driving/`).
- **Resilience**: Configurable timeout with `AbortController` (default 8,000ms). Latency is measured from request start to JSON parsing.
- **Elevation & Segment Topology**: Converts OSRM route legs and steps into structured `RouteSegment` models with terrain classification (valley, plains, mountain, pass) and estimated elevation gain/loss.

### 3.2 Nominatim Geocoding Provider (`src/lib/routing/providers/nominatim-geocoding.provider.ts`)
- **Protocol**: OpenStreetMap Nominatim API (`/search`, `/reverse`).
- **Bounded Search**: Automatically injects `viewbox=89.5,29.5,97.5,21.8` and `bounded=1` for localized NER accuracy.
- **Reference GIS Fallback**: Verified Northeast India logistics hub table provides zero-latency resolution for core regional hubs (Guwahati, Shillong, Tezpur, Jorhat, Dibrugarh, Silchar, Kohima, Imphal, Aizawl, Agartala, Dimapur, Itanagar, Gangtok).

### 3.3 Test Mock Providers (`src/lib/routing/providers/mock-routing.provider.ts`, `mock-geocoding.provider.ts`)
- **Purpose**: Strictly isolated for automated tests (`Vitest`) to guarantee 100% offline determinism and sub-second test execution without relying on external network conditions.
- **Demarcation**: Prefixed `MockTest*` and injected solely via `setRoutingServiceForTesting()` and `setGeocodingServiceForTesting()`.

---

## 4. Multi-Tenant Route Persistence & Schema

Persistence adheres to the Phase 4 PostgreSQL schema:
- **`routes`**: Tenant-scoped route definitions (`id`, `organization_id`, `name`, `code`, `origin_location_id`, `destination_location_id`, `distance_km`, `duration_minutes`, `is_active`).
- **`route_versions`**: Version history (`id`, `route_id`, `version_number`, `encoded_polyline`, `geojson_geometry`, `status`, `change_reason`, `created_by`).
- **`route_segments`**: Sequential corridor segments (`id`, `route_version_id`, `sequence_order`, `name`, `segment_type`, `distance_km`, `duration_minutes`, `road_condition`, `terrain_type`).

---

## 5. Security & Multi-Tenancy

- **Role-Based Access Control**:
  - `routes:view` (Viewer, Driver, Dispatcher, Logistics Manager, Org Admin, Super Admin): Can list, retrieve, plan, and calculate routes.
  - `routes:manage` / `shipments:create` (Dispatcher, Logistics Manager, Org Admin, Super Admin): Authorized to save corridors and publish new route versions.
  - Viewers attempting to save routes are denied with HTTP 403 Forbidden.
- **Tenant Scoping**: All saved routes require `organization_id` matching the authenticated session. Cross-tenant access is rejected at the service and HTTP layer.
- **Credential Protection**: Routing and geocoding endpoints utilize server-side environment variables (`ROUTING_BASE_URL`, `GEOCODING_BASE_URL`) never exposed to client bundles.

---

## 6. Verification Summary

| Category | Target | Actual | Status |
|---|---|---|---|
| Vitest Map/Routing Tests | 15 tests | 15 passed | PASS |
| Vitest Full Regression | 147 tests | 147 passed | PASS |
| Web TypeScript Compilation | 0 errors | 0 errors | PASS |
| Mobile TypeScript Compilation | 0 errors | 0 errors | PASS |
| Next.js Static & API Build | 43 pages | 43 pages generated | PASS |
