# AuraNER / NER-Route AI — Owner Web Portal Foundation (Phase 7 Specification)

## 1. Executive Summary & Architectural Overview

Phase 7 establishes the **production web application foundation** for the **AuraNER / NER-Route AI** platform in strict adherence to the Phase 2 UX/UI Specification, Phase 5 Dual-Engine Authentication, and Phase 6 RBAC & Multi-Tenancy models.

The portal provides mission-critical operators, emergency dispatchers, and state disaster authorities across the 8 North Eastern states with an authenticated, resilient, and responsive interface designed for high visual fidelity and rugged operational conditions.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED OWNER WEB PORTAL ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ TopBar: [☰] Breadcrumbs  [🏢 Organization Switcher]  [Search] [👤 User]  │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ TenantBanner: [🌐 Cross-Tenant Active] or [🏢 Tenant Isolation Active]   │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│   ┌──────────────────────┬──────────────────────────────────────────────────┐   │
│   │ AppSidebar           │ Viewport Area (Main Content)                     │   │
│   │ • Permission Filter  │ ┌──────────────────────────────────────────────┐ │   │
│   │ • 6-Role Matrix      │ │ Universal Six-State Resilient Components     │ │   │
│   │ • Mobile Drawer      │ │ 1. LoadingSkeleton  (Geometry Shimmers)      │ │   │
│   │ • Collapsible 72px   │ │ 2. EmptyState       (Actionable Guidance)    │ │   │
│   │ • Profile Dock       │ │ 3. ErrorState       (Correlation ID + Retry) │ │   │
│   │                      │ │ 4. Tenant-Scoped Real Dashboard Summary     │ │   │
│   │                      │ └──────────────────────────────────────────────┘ │   │
│   └──────────────────────┴──────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Universal Six-State Component System

To ensure that operators are never stranded with blank screens or ambiguous loading states in unstable mountain environments, all widgets strictly adhere to the **Universal Six-State Model**:

### 2.1 Geometry-Matched Loading Skeletons (`LoadingSkeleton.tsx`)
- Content-shaped skeleton placeholders matching the exact dimensions of final KPI cards, tables, cards, and feeds.
- Uses CSS linear gradient shimmer animations (`.skeleton { animation: shimmer 1.5s infinite; }`).
- Subcomponents:
  - `SkeletonKPI`: Geometry matches 6-column KPI cards.
  - `SkeletonCard`: Generic container skeleton with variable-width row bars.
  - `SkeletonTable`: Standardized table header and rows with alternating column widths.
  - `SkeletonList`: List row placeholders with icon, title, and badge blocks.

### 2.2 Actionable Empty State (`EmptyState.tsx`)
- Avoids dead-ends by pairing contextual iconography with bold headlines, clear explanations, and immediate calls to action.
- Primary CTA (`Button variant="primary"` with optional icon and route navigation).
- Optional Secondary CTA (`Button variant="secondary"`).
- Compact mode for dashboard side panels and auxiliary cards.

### 2.3 Resilient Error State (`ErrorState.tsx`)
- Non-alarming diagnostic container in danger glass styling (`bg-danger/5 border border-danger/25`).
- Displays support correlation ID (`ref: err_xxxx`) for backend telemetry investigations.
- Non-blocking "Retry Connection" button with real-time loading feedback.

### 2.4 Design System Tokens & Unified Button Component (`Button.tsx`)
- Standardized variants:
  - `primary`: Orchid gradient (`from-orchid to-orchid-light`) with subtle glow.
  - `secondary`: Deep forest glass (`bg-forest-100/80 hover:bg-forest-100 border border-white/10`).
  - `danger`: Red hazard button for destructive operations.
  - `ghost`: Transparent container with hover highlight.
  - `sos`: High-priority crisis button with active white pulse border and danger glow.
- Sizes: `sm`, `md`, `lg`.

### 2.5 Path-Aware Breadcrumbs (`Breadcrumbs.tsx`)
- Automatically maps Next.js route segments to human-readable titles:
  - `/dashboard` $\to$ `Command Center`
  - `/dispatch` $\to$ `Dispatch Center`
  - `/dispatch/new` $\to$ `New Dispatch`
  - `/routes` $\to$ `Smart Route AI`
  - `/risk` $\to$ `Risk Intelligence`
  - `/accessibility` $\to$ `Accessibility Radar`

---

## 3. Organization Context & Multi-Tenant Model

The web portal integrates **tenant isolation** and **role-scoped querying** directly into the component tree:

### 3.1 Organization Provider (`OrganizationContext.tsx`)
- Resolves the active user session and extracts their tenant membership (`organizationId`).
- Manages recognized North Eastern organizations:
  - `org_assam_civil_supplies`: Assam Food & Civil Supplies (`AFCS-AS`)
  - `org_meghalaya_disaster`: Meghalaya Disaster Management Authority (`MDMA-ML`)
  - `org_nagaland_relief`: Nagaland Emergency Relief Operations (`NERO-NL`)
  - `org_tripura_health`: Tripura Health & Essential Logistics (`THEL-TR`)
  - `org_mizoram_logistics`: Mizoram Transport & Supply Corp (`MTSC-MZ`)

### 3.2 Tenant Switching Capabilities
- **`SUPER_ADMIN`**: Can switch between "Global View (Cross-Tenant)" and specific regional tenants via the `OrganizationSwitcher` dropdown, permitting statewide emergency coordination.
- **Tenant-Scoped Roles (`ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `DRIVER`, `VIEWER`)**: Locked strictly to their assigned organization boundary. The switcher displays a locked verification badge.

### 3.3 Tenant Banner (`TenantBanner.tsx`)
- Docked below the header across all authenticated pages.
- Flags whether the current session is operating in **Cross-Tenant Mode** or **Tenant Isolated Mode**.

---

## 4. Permission-Aware Navigation Matrix

Sidebar navigation items are dynamically filtered on the client using the Phase 6 permission service (`hasPermission`), while backend API routes enforce strict server-side authorization:

| Navigation Item | Route | Required Permission / Role | Permitted Roles |
|---|---|---|---|
| **Command Center** | `/dashboard` | Authenticated Session | ALL 6 ROLES |
| **Dispatch Center** | `/dispatch` | `shipments:dispatch` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER` |
| **Driver View** | `/driver` | Role Guard | `DRIVER`, `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER` |
| **Smart Route AI** | `/routes` | `routes:view_all` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER` |
| **Risk Intelligence**| `/risk` | `alerts:view` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `DRIVER`, `VIEWER` |
| **Accessibility Radar** | `/accessibility` | Authenticated Session | ALL 6 ROLES |
| **Emergency Mission** | `/emergency` | Authenticated Session | ALL 6 ROLES |
| **Fleet Management** | `/fleet` | `fleet:read` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER` |
| **Warehouses** | `/warehouses` | `fleet:read` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER` |
| **Demand Forecast** | `/demand` | `shipments:read` | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `DRIVER`, `VIEWER` |
| **Disaster Simulator**| `/simulator`| Role Guard | `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER` |
| **AI Copilot** | `/copilot` | Authenticated Session | ALL 6 ROLES |
| **Analytics** | `/analytics` | Role Guard | `SUPER_ADMIN`, `ORG_ADMIN`, `LOGISTICS_MANAGER` |
| **Settings** | `/settings` | Authenticated Session | ALL 6 ROLES |

---

## 5. Strict Zero-Fabrication Policy & Dashboard Foundation

In strict adherence to project requirements:
> *"Do not fabricate operational metrics or records. If there is no real data, show an accurate empty/unavailable state."*

### 5.1 Backend Tenant-Scoped Summary Endpoint (`/api/v1/dashboard/summary`)
- Enforces authentication via session cookie or Bearer token.
- Queries genuine shipment records using `listAllShipments()` and filters them strictly using `filterByTenant(shipments, user)`.
- Calculates real counts:
  - `activeDeliveries`: Dispatches with status `DISPATCHED`, `IN_TRANSIT`, `ASSIGNED`, `REROUTING`.
  - `highRiskRoutes`: Shipments flagged with `CRITICAL` priority or active `REROUTING`.
  - `disruptions`: Shipments in `DELAYED` or `REROUTING` status.
  - `activeVehicles`: Distinct count of vehicles assigned to active dispatches.
  - `deliveredShipments`: Verified delivered count.
  - `regionalAccessibility`: Set to `null` until live roadside sensors are connected (never hardcodes fake percentages).
- System Engine Status flags:
  - `routeEngine`: `ONLINE`
  - `riskPrediction`: `ONLINE`
  - `telemetryStream`: `LIVE` if active shipments exist; otherwise `STANDBY`.
  - `satelliteRadar`: `STANDBY`.

### 5.2 Dashboard Command Center Viewport (`src/app/(app)/dashboard/page.tsx`)
- When an organization has zero shipments, displays accurate `0` KPI metrics and renders the **Universal Empty State**:
  - Title: *"No Active Shipments in Transit"*
  - Description: Guides the operator to plan a new shipment or select another tenant scope.
  - Primary Action: `[+ Plan New Shipment]` linking to `/dispatch/new`.
  - Secondary Action: `[Go to Dispatch Center]` linking to `/dispatch`.
- Sector alerts display a clean status card: *"All Monitored Corridors Clear"* when no hazardous incidents are flagged.
- Non-blocking manual "Refresh Data" button with re-fetch indicator.

---

## 6. Responsive Layout Architecture

The application shell adapts seamlessly to varied form factors:
- **Desktop ($\ge 1024\text{px}$)**:
  - Persistent sidebar with smooth expansion/collapse toggle (`w-[72px]` collapsed vs `w-[260px]` expanded).
  - Main viewport dynamic margin adjustment (`ml-[72px]` vs `ml-[260px]`).
- **Mobile & Tablet ($< 1024\text{px}$)**:
  - Sidebar slides offscreen (`-translate-x-full`).
  - TopBar hamburger button toggles full mobile drawer overlay with dark backdrop blur.
  - Touching backdrop or selecting any route automatically closes the drawer.
  - Viewport margin resets cleanly to `ml-0`.

---

## 7. Automated Test Suite & Quality Verification

Phase 7 is covered by the dedicated test suite [`src/lib/test/portal-foundation.test.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/test/portal-foundation.test.ts):

1. **Permission-Aware Navigation**:
   - Verifies `SUPER_ADMIN` receives all 13 modules.
   - Verifies `VIEWER` is strictly barred from `/dispatch`, `/driver`, `/simulator`, `/analytics`.
   - Verifies `DISPATCHER` receives `/dispatch`, `/driver`, `/simulator`, and is barred from `/analytics`.
   - Verifies `LOGISTICS_MANAGER` receives `/analytics` and `/fleet`, and is barred from `/driver` and `/simulator`.
   - Verifies `DRIVER` receives `/driver` only.
2. **Organization Context & Regional Tenants**:
   - Validates authentic state codes and organization names for Assam, Meghalaya, Nagaland, Tripura, and Mizoram.
3. **Dashboard Summary API (Zero Fabrication)**:
   - Rejects unauthenticated requests with `401 Unauthorized`.
   - Validates non-negative true counts and `null` uncalibrated sensor fields.
   - Verifies `SUPER_ADMIN` receives global cross-tenant scope (`isCrossTenant: true`, `tenantId: 'GLOBAL'`).
   - Verifies tenant isolation: Meghalaya dispatches do not increment Assam dashboard summary metrics.
4. **Build & Typecheck Results**:
   - Vitest: **84 / 84 tests passing** across 7 test suites.
   - TypeScript: **0 errors** (`tsc --noEmit`).
   - Next.js: **38 / 38 production routes compiled successfully**.
