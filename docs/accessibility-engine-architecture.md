# Phase 16: Accessibility Intelligence Engine Architecture Specification

**Document Version:** 2.0.0-PROD  
**Status:** IMPLEMENTED & PRODUCTION-VERIFIED  
**Component:** Accessibility Intelligence Engine (`src/lib/services/accessibility.service.ts`, `src/lib/types/accessibility.ts`, `src/app/api/v1/accessibility/*`)  
**Target Coverage:** Northeast India (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim)

---

## 1. Executive Summary & Core Invariants

The **AuraNER / NER-Route AI Accessibility Intelligence Engine** assesses corridor passability, settlement isolation, facility ingress capabilities, and physical vehicular access requirements across Northeast India's complex hill terrains and floodplains.

### Fundamental Operating Invariants

1. **Zero Fabrication Invariant**:
   - The engine strictly refuses to invent or hallucinate accessibility scores, route passability, or clearance metrics.
   - When coordinates lack authoritative observations, field reports, or administrative orders, the engine explicitly outputs `accessibilityTier: 'UNKNOWN'`, `vehicleRequirement: 'UNKNOWN'`, `confidence: 0.0`, and `confidenceRating: 'UNKNOWN'` accompanied by an actionable field scout advisory.
2. **Authoritative Administrative Precedence**:
   - District Disaster Management Authorities (DDMA), Border Roads Organisation (BRO), State PWDs, and National Highways & Infrastructure Development Corporation Limited (NHIDCL) declarations take absolute precedence over base topological heuristics.
   - If an active administrative declaration tags a sector as `ISOLATED`, the corridor is classified as severed (`passable: false`, `worstTier: 'ISOLATED'`).
3. **Physical Vehicular Constraint Enforcement**:
   - Mountain sectors exhibiting average gradient slope $> 12\%$ or road surface condition scores $< 45$ (broken bitumen, seasonal mud, gravel washouts) mandate `FOUR_WHEEL_DRIVE_ONLY`.
   - Non-4WD vehicle dispatches traversing these corridors trigger actionable `CONVOY_ESCORT_REQUIRED` warnings.
4. **Temporal Freshness & Uncertainty Decay**:
   - Declarations and accessibility observations age across distinct validity windows:
     - **$\le 12$ hours**: `FRESH` (Full confidence, verified).
     - **$> 48$ hours**: `STALE` (Confidence penalized to $\le 0.70$, triggers field re-verification warnings).
     - **Resolved / Outdated**: `EXPIRED` (Treated as inactive history; unobserved fallback applied).
5. **No Optimization in Phase 16**:
   - In accordance with phase boundaries, accessibility assessment delivers deterministic evaluation without invoking OR-Tools dispatch optimization.

---

## 2. Domain Entities & Data Model

The data model is formalized in [`src/lib/types/accessibility.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/types/accessibility.ts) and validated using Zod in [`src/lib/validation/index.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/validation/index.ts).

### Accessibility Tiers (`AccessibilityTier`)
- **`HIGH`**: All-weather highway or arterial corridor; passable by standard commercial logistics fleet throughout the year.
- **`MEDIUM`**: Seasonal state road or semi-paved sector; standard medium-duty vehicles passable during dry weather; speed reductions during rain.
- **`LOW`**: Rugged hill track or unpaved mountain pass; mandates 4WD or high-clearance off-road chassis.
- **`ISOLATED`**: Completely severed by landslide, washed-out bailey bridge, or official evacuation order. Zero vehicular transit permitted.
- **`UNKNOWN`**: No authoritative ground observation available. Unobserved coordinate fallback.

### Vehicle Access Requirements (`VehicleAccessRequirement`)
- **`ALL_VEHICLES`**: Standard 2WD, medium/heavy commercial vehicles permitted.
- **`HIGH_CLEARANCE_ONLY`**: Moderate ruts, gravel washboards; minimum 220mm ground clearance required.
- **`FOUR_WHEEL_DRIVE_ONLY`**: Low traction mud, $> 12\%$ mountain gradients; 4x4 low-range transmission mandatory.
- **`AIR_DROP_ONLY`**: Complete overland isolation; helicopter / UAV resupply only.
- **`NO_ACCESS`**: Total administrative transit ban.
- **`UNKNOWN`**: Unverified vehicular requirement.

### Core Schema: `AccessibilityDeclaration`
```typescript
export interface AccessibilityDeclaration {
  id: string;
  declarationCode: string;               // e.g. "DEC-AS-2026-001"
  declaringAuthority: string;             // e.g. "BRO_PROJECT_VARTAK", "DDMA_DIMA_HASAO"
  state: string;                          // Northeast state code (e.g. "AS", "NL")
  settlementName: string;                 // Affected village or town (e.g. "Haflong")
  coordinates: Coordinates;              // WGS84 [lat, lng]
  previousTier: AccessibilityTier;
  newTier: AccessibilityTier;             // 'HIGH' | 'MEDIUM' | 'LOW' | 'ISOLATED' | 'UNKNOWN'
  reason: string;                         // Official cause (e.g., "Bridge collapse on NH-27")
  affectedCorridor?: string;              // Highway identifier (e.g., "NH-27")
  estimatedRestorationHours?: number;
  isActive: boolean;
  freshness: EventFreshnessStatus;       // 'FRESH' | 'STALE' | 'EXPIRED'
  isStale: boolean;
  declaredAt: string;                    // ISO timestamp
  resolvedAt?: string | null;
  provenance: {
    sourceId: string;
    ingestionRunId?: string;
    verifiedBy?: string;
    hash: string;
  };
}
```

### Assessment Output: `AccessibilityAssessmentResult`
```typescript
export interface AccessibilityAssessmentResult {
  id: string;
  targetType: 'ROUTE' | 'FACILITY' | 'LOCATION';
  targetIdentifier: string;
  accessibilityTier: AccessibilityTier;
  vehicleRequirement: VehicleAccessRequirement;
  confidence: number;                     // 0.0 to 1.0
  confidenceRating: 'VERIFIED_HIGH' | 'PROBABLE' | 'UNCERTAIN' | 'UNKNOWN';
  freshness: EventFreshnessStatus | 'UNKNOWN';
  isStale: boolean;
  attributes: AccessibilityAttributeSet;
  routeProfile?: RouteAccessibilityProfile;
  facilityProfile?: FacilityAccessibilityProfile;
  warnings: AccessibilityWarning[];
  activeDeclarationsCount: number;
  explainability: {
    summary: string;
    limitingFactor: string;
    sourcesConsulted: string[];
    uncertaintyNote?: string;
  };
  provenance: {
    engineVersion: string;
    assessedAt: string;
    sources: string[];
    assessmentHash: string;
  };
}
```

---

## 3. Geographic Boundary & Geofence Validation

Every assessed coordinate or declaration location must strictly fall inside the official Northeast India geospatial envelope:
$$\text{Latitude} \in [21.5^\circ\text{N}, 29.5^\circ\text{N}], \quad \text{Longitude} \in [88.0^\circ\text{E}, 97.5^\circ\text{E}]$$

Locations outside these boundaries are immediately rejected with an HTTP `400 Bad Request` AppError:
```typescript
if (!isWithinNerBounds(location.coordinates.lat, location.coordinates.lng)) {
  throw new BadRequestError(
    `Location coordinates [${location.coordinates.lat}, ${location.coordinates.lng}] fall outside Northeast India`
  );
}
```

---

## 4. Assessment Algorithms & Logic

### 4.1 Route Corridor Passability (`evaluateRouteAccessibility`)
1. **Impact Zone Identification**: Each route segment is cross-referenced with active declarations within a 10 km corridor buffer.
2. **Bottleneck Detection**: If an active declaration reports `ISOLATED`, the entire route is flagged as severed:
   - `worstTier = 'ISOLATED'`
   - `requiredVehicle = 'NO_ACCESS'`
   - `isFullyPassable = false`
   - Emits a `VILLAGE_ISOLATED` critical warning with reroute advisory.
3. **Terrain & Surface Ingress**:
   - If segment terrain is `MOUNTAINOUS` or gradient slope $> 12\%$:
     - Minimum vehicle upgraded to `FOUR_WHEEL_DRIVE_ONLY`.
     - High tier degraded to `MEDIUM`.
   - If road surface condition score $< 45$:
     - Tier downgraded to `LOW`.
     - Minimum vehicle upgraded to `FOUR_WHEEL_DRIVE_ONLY`.
4. **Fleet Compatibility Matching**:
   - If corridor demands `FOUR_WHEEL_DRIVE_ONLY` and the dispatch vehicle specification has `is4WD: false`, an actionable `CONVOY_ESCORT_REQUIRED` warning is emitted.

### 4.2 Settlement & Location Evaluation (`evaluateLocationAccessibility`)
1. **Proximity Matching**: Correlates coordinates within 15 km of known active declarations or matching settlement names.
2. **Freshness Decay**:
   - If the active declaration was issued $> 48$ hours ago, `isStale = true`, `freshness = 'STALE'`, confidence drops to 0.70 (`PROBABLE`), and a `STALE_INTELLIGENCE_WARNING` is attached.
3. **Base Terrain Heuristics (Named Locations with Known Elevation)**:
   - Elevation $> 2200$m: Tier `LOW`, `FOUR_WHEEL_DRIVE_ONLY`, night travel restricted.
   - Elevation $> 1000$m: Tier `MEDIUM`, `HIGH_CLEARANCE_ONLY`.
   - Elevation $\le 1000$m: Tier `HIGH`, `ALL_WEATHER`.
4. **Zero-Fabrication Fallback (Unobserved Locations)**:
   - If no declaration matches and elevation/ground data is missing:
     - Returns `tier: 'UNKNOWN'`, `vehicleRequirement: 'UNKNOWN'`, `confidence: 0.0`.
     - Freshness: `UNKNOWN`.
     - Emits zero synthetic scores.

### 4.3 Facility Ingress Profiling (`evaluateFacilityAccessibility`)
1. Evaluates dock clearance, maximum gross weight capacity, and all-weather access road suitability.
2. Major regional hubs (Guwahati Central WH-01, Silchar Transit) support 4.5m dock clearances, 40-tonne bridge limits, and all standard vehicles.
3. Remote mountain distribution centers mandate high clearance and four-wheel-drive feeder vehicles.

---

## 5. Security & RBAC Enforcement

The Accessibility Engine integrates directly with the platform's multi-tenant RBAC system ([`src/lib/auth/authorization.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/auth/authorization.ts)):

| Endpoint | HTTP Method | Required Permission | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `/api/v1/accessibility/assess` | `POST` | `data:read` | `ADMIN`, `DISPATCHER`, `SAFETY_OFFICER`, `DRIVER`, `VIEWER` |
| `/api/v1/accessibility/declarations` | `GET` | `data:read` | `ADMIN`, `DISPATCHER`, `SAFETY_OFFICER`, `DRIVER`, `VIEWER` |
| `/api/v1/accessibility/declarations` | `POST` | `data:ingest` | `ADMIN`, `DISPATCHER`, `SAFETY_OFFICER` (denies `VIEWER`, `DRIVER`) |
| `/api/v1/accessibility/declarations/[id]` | `GET` | `data:read` | `ADMIN`, `DISPATCHER`, `SAFETY_OFFICER`, `DRIVER`, `VIEWER` |
| `/api/v1/accessibility/declarations/[id]` | `PATCH` | `data:ingest` | `ADMIN`, `DISPATCHER`, `SAFETY_OFFICER` |

### Tamper-Evident Audit Logging
All administrative declaration creations, state transitions, and resolutions append tamper-evident SHA-256 hash entries to the audit trail (`ACCESSIBILITY_DECLARATION_CREATED`, `ACCESSIBILITY_DECLARATION_RESOLVED`).

---

## 6. Verification & Quality Assurance

The Accessibility Engine was verified against a comprehensive 15-test test suite ([`src/lib/test/accessibility-engine.test.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/test/accessibility-engine.test.ts)):

1. **Geographic Boundaries**: Enforces strict Northeast India bounding box constraints.
2. **Zero-Fabrication Fallback**: Verifies unobserved locations yield `UNKNOWN` without synthetic hallucination.
3. **Route Passability**: Validates corridor passability on flat plains and severed corridors on `ISOLATED` sectors.
4. **4WD Ingress Constraints**: Asserts gradient slope $> 12\%$ triggers `FOUR_WHEEL_DRIVE_ONLY` and flags non-4WD vehicles.
5. **Freshness & Decay**: Asserts declarations $> 48$h decay to `STALE` with confidence down-rating and field verification alerts.
6. **Administrative Declarations CRUD**: Verifies declaration creation, querying, updates, and resolution lifecycles.
7. **RBAC Gating**: Asserts `VIEWER` and `DRIVER` are forbidden from publishing declarations (`403 Forbidden`) while `DISPATCHER` succeeds (`201 Created`).

### Test & Build Summary
- **Accessibility Unit & Integration Tests**: 15/15 passed (`src/lib/test/accessibility-engine.test.ts`).
- **Regression Test Suite**: 16/16 test files passed, 249/249 tests passed (0 failures).
- **TypeScript Typecheck**: Strict 0 errors (`npm run typecheck` & `npx tsc -p mobile/tsconfig.json --noEmit`).
- **Next.js Production Build**: Clean static and dynamic compilation (`npm run build`).
