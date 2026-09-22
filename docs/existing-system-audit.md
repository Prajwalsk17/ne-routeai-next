# AuraNER / NER-Route AI — Existing System Audit

## 1. Executive Summary

This document provides a comprehensive technical audit of the existing **NER-Route AI** repository (also referred to as AuraNER). 
The application is currently deployed at: `https://ne-routeai-next.vercel.app/dispatch`.

The current implementation serves as a functional proof-of-concept and prototype demonstration for intelligent dispatch, route safety, and terrain-aware logistics in India's North Eastern Region (NER). While it showcases sophisticated vector mapping (MapLibre GL) and geospatial risk scoring workflows, the platform currently relies on hybrid and temporary mechanisms—including an in-memory / ephemeral SQLite database, mock and static datasets, prototype OTP flows, client-side driver simulation, and monolithic Next.js API routes—that are unsuitable for production enterprise deployments.

---

## 2. Repository & Technology Stack Analysis

### 2.1 Codebase Structure
```
ne-routeai-next/
├── .env.example             # Documented environment variables with dual-mode flags
├── .gitignore               # Standard ignores (.env*, SQLite, .next, node_modules)
├── next.config.js           # Security headers, CSP/Permissions-Policy, Leaflet/SQLite configs
├── package.json             # Next.js 14, React 18, MapLibre GL, Supabase, Vitest, better-sqlite3
├── prisma/                  # Contains SQLite database files (*.db, *.db-wal), NO schema.prisma
├── supabase/
│   ├── migrations/          # 0001_init.sql: Complete PostgreSQL + PostGIS schema draft
│   └── seed/                # dev.sql: NER reference hub seed data
├── src/
│   ├── app/
│   │   ├── (app)/           # Authenticated application route group (13 pages)
│   │   │   ├── dispatch/    # Dispatch Command Center & 7-step planning wizard
│   │   │   ├── dashboard/   # High-level logistics KPIs & metrics
│   │   │   ├── routes/      # Road routing, elevation, and terrain visualization
│   │   │   ├── risk/        # Hazard intelligence & regional risk scores
│   │   │   ├── accessibility/# Static accessibility indexing
│   │   │   ├── emergency/   # Crisis mission planning & safe haven finder
│   │   │   ├── fleet/       # Vehicle fleet listing and status
│   │   │   ├── warehouses/  # Storage hub capacity & supply status
│   │   │   ├── demand/      # Basic demand forecasting simulation
│   │   │   ├── simulator/   # Disaster impact simulator
│   │   │   ├── copilot/     # Heuristic AI assistant
│   │   │   ├── analytics/   # Logistics performance charts
│   │   │   └── settings/    # Configuration & local cache reset
│   │   ├── api/
│   │   │   ├── v1/          # Modular API endpoints (dispatch, routes, telemetry, etc.)
│   │   │   ├── [...route]/  # Legacy catch-all REST API endpoint
│   │   │   └── health/      # Uptime and health check
│   │   ├── driver/          # Mobile-web driver navigation prototype
│   │   ├── login/           # Credentials + OTP authentication UI
│   │   └── signup/          # Registration UI
│   ├── components/
│   │   ├── DispatchMap.tsx  # MapLibre GL vector engine (rotations, layers, routes, safe havens)
│   │   ├── MapView.tsx      # Legacy Leaflet map component
│   │   ├── Copilot.tsx      # AI Copilot chat drawer
│   │   ├── layout/          # TopBar, Sidebar navigation
│   │   └── ui/              # Badge, KPICard, GlassCard, DataTable, ProgressBar
│   ├── lib/
│   │   ├── adapters/        # Circuit breaker, routing, geocoding, weather, telemetry
│   │   ├── api/             # Standard API response envelope & error handlers
│   │   ├── auth/            # Roles, RBAC permissions, session helpers, OTP utilities
│   │   ├── db/              # Supabase server/browser client wrappers
│   │   ├── engines/         # Legacy routing, risk, accessibility, emergency math engines
│   │   ├── providers/       # OSRM, Open-Meteo, Nominatim, Telemetry providers
│   │   ├── services/        # Business logic (dispatch, risk, vehicle rec, recalculation)
│   │   ├── test/            # Vitest 13-step scenario & enterprise architecture tests
│   │   ├── types.ts         # Legacy domain TypeScript interfaces
│   │   ├── validation/      # Zod validation schemas for all domain entities
│   │   ├── db.ts            # SQLite better-sqlite3 database layer & in-memory fallback
│   │   └── seed-data.ts     # Static mock hubs, vehicles, deliveries, and dashboard stats
│   └── middleware.ts        # Next.js route protection & token validation
```

---

## 3. Existing `/dispatch` Implementation Audit

The `/dispatch` module is the primary operational hub of the current application.

### 3.1 Dispatch Command Center (`src/app/(app)/dispatch/page.tsx`)
- **UI Architecture**: Implements a two-column operational dashboard with MapLibre GL (`DispatchMap.tsx`) vector radar on the left and live shipment/alert feeds on the right.
- **Data Ingestion & Polling**: Uses client-side `setInterval` polling every 4,000ms across 4 API endpoints simultaneously:
  - `GET /api/v1/shipments`
  - `GET /api/v1/alerts`
  - `GET /api/v1/incidents?status=ACTIVE`
  - `GET /api/v1/telemetry`
- **Strengths**:
  - Live vector map rendering with real coordinates across the Northeast region.
  - Interactive triage buttons for acknowledging, escalating, or resolving alerts.
  - One-click trigger for emergency route recalculation when a shipment encounters a hazard.
- **Weaknesses & Gaps**:
  - Unbounded client-side polling every 4 seconds generates substantial unnecessary HTTP traffic and server load without HTTP/2 push or WebSockets.
  - If the database falls back to SQLite in-memory, telemetry and shipment records reset on serverless instance recycles.
  - Recalculation logic uses a fallback coordinate `(26.35, 92.4)` if vehicle telemetry is temporarily absent.

### 3.2 Dispatch 7-Step Planning Wizard (`src/app/(app)/dispatch/new/page.tsx`)
- **Workflow**:
  1. Origin search with autocompletion and terrain classification.
  2. Destination search with mountain pass elevation profiling.
  3. Cargo specifications (weight, volume, priority, cold-chain toggle).
  4. AI fleet recommendation evaluation (filtering by gradient limits and payload).
  5. Multi-criteria road routing (OSRM integration with Open-Meteo weather sampling).
  6. Dynamic risk assessment and detour evaluation.
  7. Final dispatch execution, driver assignment, and notification dispatch.
- **Strengths**:
  - Full end-to-end user experience flow that validates real geospatial routing.
  - Clean wizard navigation with input validation via Zod schemas.
- **Weaknesses & Gaps**:
  - Vehicle fleet recommendations rely on static mock vehicles rather than real-time telematics.
  - Route planning does not perform Vehicle Routing Problem (VRP) optimization across multiple stops or multi-depot pickups.

---

## 4. Backend & API Code Audit

### 4.1 Dual API Structure
The repository contains two competing API implementations:
1. **Modern V1 APIs (`src/app/api/v1/*`)**:
   - Modular Next.js route handlers (`search`, `vehicles/recommend`, `routes/plan`, `shipments`, `dispatch`, `incidents`, `alerts`, `telemetry`, `routes/recalculate`).
   - Strong validation via Zod schemas (`src/lib/validation/index.ts`).
   - Standardized JSON response envelope: `{ success, data, error, meta }`.
   - Uses `src/lib/services/*` business logic and `src/lib/adapters/*` with circuit breaker fault tolerance.
2. **Legacy Monolithic Catch-All API (`src/app/api/[...route]/route.ts`)**:
   - Monolithic 290-line handler capturing all unhandled routes.
   - Directly calls `src/lib/db.ts` (SQLite) and `src/lib/seed-data.ts`.
   - Contains endpoints returning static mock data (`dashboard` returns `DASHBOARD_STATS`, `analytics` returns `ANALYTICS_DATA`).
   - Embeds legacy authentication handlers (`auth/login`, `auth/verify-otp`, `auth/signup`).

---

## 5. Database & Persistence Layer Audit

### 5.1 SQLite & Better-SQLite3 (`src/lib/db.ts`)
- Utilizes `better-sqlite3` targeting `prisma/ner-routeai.db` in local environments or `/tmp/ner-routeai.db` on serverless (Vercel).
- If disk write fails or on serverless cold starts, it initializes an `:memory:` database and re-seeds it with static data.
- **Critical Flaw**: Ephemeral filesystem on serverless causes data loss between function invocations. Data written by one request is not visible to another serverless container.
- **Prisma Misconfiguration**: The `prisma/` folder contains raw `.db` binary files, but no `schema.prisma` file exists, and Prisma is not generating any client code.

### 5.2 Supabase PostgreSQL + PostGIS Schema (`supabase/migrations/0001_init.sql`)
- Well-architected relational and spatial schema defining PostGIS geometry types (`GEOGRAPHY(Point, 4326)`, `GEOMETRY(LineString, 4326)`).
- Defines spatial indexes (`GIST`) for spatial proximity queries (e.g. `ST_DWithin` for detecting hazards within 5 km of route segments).
- Includes core tables: `organizations`, `users`, `vehicles`, `locations`, `shipments`, `routes`, `route_segments`, `incidents`, `alerts`, `telemetry`, `safe_locations`, and `audit_logs`.
- **Gap**: Supabase client integration in `src/lib/db/supabase.ts` is only partially wired; many API routes still execute against the local in-memory fallback when Supabase credentials are absent.

---

## 6. Authentication & Security Audit

### 6.1 Current Auth Mechanics
- **Credentials & Hashing**: `bcryptjs` for password hashing with 12 salt rounds.
- **Token Signing**: Custom `jsonwebtoken` signing with hardcoded fallback secret (`'ner-routeai-secret-key-sih-2024-production'`).
- **OTP Flow**:
  - `src/app/api/[...route]/route.ts` generates a 6-digit OTP and returns `otp_preview` in the cleartext JSON response for quick demonstration.
  - The login UI (`src/app/login/page.tsx`) displays an auto-fill button that copies the preview OTP directly into the inputs.
  - This is an insecure demonstration shortcut that must be completely removed in production.
- **Route Protection**: `src/middleware.ts` inspects cookies (`ner_token`, `sb-access-token`) or `Authorization: Bearer <token>`. Redirects unauthenticated page requests to `/login?from=<path>`.

---

## 7. Mobile Platform Status

### 7.1 Web Driver Prototype (`src/app/driver/page.tsx`)
- Currently implemented as a responsive web page in Next.js rather than a native mobile application.
- Uses hardcoded driver identity (`Officer Tenzing Norbu`) and a pre-scripted array of 5 GPS waypoints along the NH-29 Dimapur-Kohima mountain corridor:
  - `SIMULATION_POINTS = [{ lat: 25.8600, lng: 93.7500, ... }, ...]`
- Does not support background geolocation tracking, offline tile storage, hardware sensor access (gyroscope/accelerometer for crash detection), or native push notifications (FCM).

---

## 8. Map & GIS Systems Audit

### 8.1 Map Engine Bifurcation
- **`src/components/DispatchMap.tsx`**: High-performance vector map using MapLibre GL 4.7. Supports 3D pitch, vehicle marker rotation based on GPS heading, color-coded hazard buffer circles, safe haven markers, and road segment topologies.
- **`src/components/MapView.tsx`**: Legacy raster map using Leaflet and `react-leaflet`. Lacks hardware acceleration, smooth rotation, and native GeoJSON performance.

---

## 9. Testing & Build Tooling Audit

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- **Tests**: Vitest suite (`npm test`) passes with 17/17 tests passing across:
  - `src/lib/test/scenario.test.ts` (13-step operational workflow verification).
  - `src/lib/test/enterprise-architecture.test.ts` (16 architectural contract checks).
- **Build**: `npm run build` compiles cleanly into 34 production routes.
- **Linting**: `npm run lint` previously failed to run non-interactively because `eslint` was missing from `devDependencies` and no `.eslintrc.json` was present.

---

## 10. Comprehensive Component Disposition Matrix

| Component / File Path | Current Role | Disposition | Target Architecture Migration Action |
| :--- | :--- | :--- | :--- |
| `src/app/(app)/dispatch/page.tsx` | Dispatch Command Center UI | **REFACTOR** | Retain MapLibre vector radar; replace 4s HTTP polling with SSE/WebSocket updates from FastAPI. |
| `src/app/(app)/dispatch/new/page.tsx` | 7-Step Planning Wizard | **REFACTOR** | Retain step flow; connect to FastAPI OR-Tools optimization endpoint for multi-stop route planning. |
| `src/app/driver/page.tsx` | Mobile web driver view | **REPLACE** | Replace with standalone React Native Expo mobile application. |
| `src/components/DispatchMap.tsx` | MapLibre GL vector map | **KEEP / ENHANCE** | Keep as primary map component; add offline caching and vector tile pre-fetching. |
| `src/components/MapView.tsx` | Leaflet raster map | **REMOVE** | Completely deprecate and remove; standardize on MapLibre GL. |
| `src/app/api/[...route]/route.ts` | Legacy catch-all API | **REMOVE** | Deprecate entirely; route all traffic through FastAPI backend. |
| `src/app/api/v1/*` | Next.js API route handlers | **REFACTOR / MIGRATE** | Migrate business logic, optimization, and spatial processing to FastAPI. |
| `src/lib/db.ts` | SQLite / better-sqlite3 | **REMOVE** | Decommission completely; replace with PostgreSQL/PostGIS connection pooling. |
| `prisma/` | SQLite database files | **REMOVE** | Remove unused binary files; schema is managed via PostgreSQL migrations. |
| `supabase/migrations/0001_init.sql` | PostGIS schema | **REFACTOR / ENHANCE** | Expand to 30+ domain entities, add RLS policies and pgvector extensions. |
| `src/lib/auth.ts` | Custom JWT & bcrypt | **REPLACE** | Replace with Firebase Authentication Admin SDK validation and session cookies. |
| `src/lib/seed-data.ts` | Static mock data | **REFACTOR** | Maintain strictly as development/test seed fixtures; remove from production runtime paths. |
| `src/lib/engines/copilot-engine.ts` | Heuristic keyword matcher | **REPLACE** | Replace with LangGraph multi-agent orchestration backed by LLM tools and RAG. |
| `src/lib/adapters/circuit-breaker.ts`| Circuit breaker utility | **KEEP / MIGRATE**| Migrate pattern to Python/FastAPI backend for outbound provider calls. |
