# AuraNER / NER-Route AI — Smart Logistics & Accessibility Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-emerald.svg)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_0_Errors-purple.svg)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Vitest-407%2F407_Passed-teal.svg)](https://vitest.dev)
[![Spatial DB](https://img.shields.io/badge/Spatial_DB-PostgreSQL_%2B_PostGIS-blue.svg)](https://postgis.net)
[![Coverage](https://img.shields.io/badge/Coverage-All_8_Northeast_India_States-amber.svg)](#geographic-coverage)

**AuraNER / NER-Route AI** is an enterprise AI Smart Logistics, Dispatch Coordination, and Accessibility Intelligence Platform engineered specifically for India's **North Eastern Region (NER)**—covering Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, and Sikkim.

The platform addresses severe terrain and meteorological obstacles: active landslide corridors, heavy monsoon flash flooding, steep mountain gradients ($> 15\%$), single-lane highway chokepoints, and intermittent telecommunications.

---

## 📚 Platform Architecture & Specification Suite

The complete engineering blueprints, specifications, and audits are documented in the [`docs/`](./docs) directory:

### Phase 1: Requirements & Architecture
1. 🔍 **[Existing System Audit](./docs/existing-system-audit.md)**: Complete current-state analysis of the codebase, `/dispatch` implementation, technical debt, mock datasets, and component disposition (KEEP, REFACTOR, REPLACE, REMOVE).
2. 📋 **[System Requirements Specification](./docs/requirements.md)**: Exhaustive functional and non-functional requirements for the Next.js Web Platform, React Native Expo Mobile App, 6 RBAC roles, and NER terrain constraints.
3. 🏛️ **[Target Architecture Blueprint](./docs/architecture.md)**: Distributed architecture specification featuring FastAPI, PostgreSQL 16 + PostGIS, Redis 7, Google OR-Tools, LangGraph multi-agent workflows, and 30+ planned domain entities.
4. 📦 **[Dependency & Decommission Strategy](./docs/dependency-strategy.md)**: Ecosystem package strategy across Web, Mobile, and Backend tiers, including decommissioning of legacy packages (`better-sqlite3`, Prisma, ad-hoc JWT).
5. 🧪 **[Testing & Quality Assurance Strategy](./docs/testing-strategy.md)**: Multi-tier testing strategy covering unit, spatial PostGIS, OR-Tools solver benchmarks, mobile offline sync, and the 13-step E2E verification scenario.
6. 🛡️ **[Security, Governance & Compliance Strategy](./docs/security-strategy.md)**: Firebase Auth, PostgreSQL Row-Level Security (RLS) multi-tenancy, SHA-256 tamper-evident audit logs, and India's DPDP Act 2023 compliance.
7. 🚀 **[Deployment & DevOps Strategy](./docs/deployment-strategy.md)**: Multi-environment matrix (DEV, STAGING, PROD), multi-stage Dockerfiles, Terraform IaC, GitHub Actions CI/CD, and zero-downtime Alembic migrations.

### Phase 2: UX/UI Specification
8. 🎨 **[Master UX/UI Specification](./docs/ux-ui-specification.md)**: Multi-platform operational philosophy ("Borders of Nature & Tech"), user personas, and master operational journey.
9. 💎 **[Design System & Component Library](./docs/design-system.md)**: Color tokens (Forest, Mist, Orchid, Teal, Amber, Danger, Safe), Inter/JetBrains typography, glassmorphism, buttons, forms, tables, cards, dialogs, drawers, and radar controls.
10. 🖥️ **[Web Information Architecture](./docs/web-information-architecture.md)**: Exhaustive Information Architecture for all 14 Owner Web Portal screens with purpose, hierarchy, actions, filters, forms, confirmations, permissions, and 6 operational states.
11. 📱 **[Mobile Information Architecture](./docs/mobile-information-architecture.md)**: End-to-end specifications for all 10 Driver Mobile screens (Auth, Home, My Trip, Navigation, Trip Status, Report Problem, Notifications, SOS, Profile, Offline Sync).
12. ♿ **[Accessibility & Inclusivity Guidelines](./docs/accessibility-ux.md)**: WCAG 2.1 AA compliance, high-contrast mountain daylight mode, night vision mode, screen readers (`aria-live`), and in-cab audio/haptics.
13. 📐 **[Responsive Design & Layout Grid](./docs/responsive-design.md)**: Responsive behavior across Ultra-wide, Desktop, Laptop, Tablet, and Mobile Web; touch target ergonomics.
14. 🔄 **[Universal UI State Specification](./docs/ui-state-specification.md)**: Complete specifications for Loading, Empty, Error, Unavailable, Stale-Data, and Offline states.
15. ⚡ **[Interaction Patterns & Workflows](./docs/interaction-patterns.md)**: Tier-3 destructive confirmations, data provenance badges, emergency detour acceptance, and multi-tier alert escalation.

### Phase 3: Infrastructure Foundation
16. 🏗️ **[Production Infrastructure Architecture](./docs/infrastructure-architecture.md)**: Network topology (VNet/Subnets), Azure/AWS hosting, containerization, Kubernetes (AKS) pod scaling, secret management with Azure Key Vault, backup & DR strategy.
17. ⚙️ **[Configuration Management & Environment Strategy](./docs/configuration-management.md)**: DEV/STAGING/PROD strategy, variable catalog, production safety invariants (prohibiting mocks in prod), and secret rotation policies.
18. 📊 **[Observability, Logging & Health Architecture](./docs/observability-logging.md)**: Structured JSON logging with PII sanitization, two-tier health probes (Liveness vs Deep Readiness), OpenTelemetry tracing, and operational alert rules.

### Phase 4: PostgreSQL + PostGIS Enterprise Foundation
19. 🐘 **[Database Architecture & Domain Schema Specification](./docs/database-schema.md)**: PostgreSQL 16 + PostGIS 3.4 + pgvector enterprise schema covering all 34 domain entities, spatial GiST indexing, SHA-256 hash chaining, and multi-tenant RLS.

### Phase 5: Authentication & Session Management
20. 🔐 **[Authentication Architecture & Implementation Specification](./docs/authentication-architecture.md)**: Production-grade Firebase and cryptographic session architecture, dual-engine verification, HTTP-only cookie security, and edge middleware route protection.

### Phase 6: RBAC & Multi-Tenancy
21. 🏢 **[Role-Based Access Control (RBAC) & Multi-Tenancy Architecture](./docs/rbac-multitenancy.md)**: Enterprise RBAC matrix across all 6 roles, tenant isolation, backend authorization enforcement, and declarative UI gating.

### Phase 7: Owner Web Portal Foundation
22. 🖥️ **[Owner Web Portal Foundation Architecture](./docs/portal-foundation.md)**: Production web application shell, organization & user contexts, permission-aware navigation, universal six-state components (`EmptyState`, `ErrorState`, `LoadingSkeleton`), responsive mobile drawer layout, and zero-fabrication metrics dashboard.

### Phase 8: Driver Mobile Foundation
23. 📱 **[Driver Mobile Foundation Architecture](./docs/mobile-foundation.md)**: React Native + Expo driver mobile application foundation, in-cab touch ergonomics (48pt/64pt), conditional session routing, 10 modular screens (Auth, Home, My Trip, Navigation, Trip Status, Report Problem, Notifications, SOS, Profile, Offline Sync), zero-fabrication state handling, and outbox queue sync foundation.

### Phase 9: Fleet + Drivers Management
24. 🚛 **[Fleet & Driver Management Architecture](./docs/fleet-drivers-management.md)**: Production-grade Fleet and Driver subsystems, physical vehicle specifications (payload, volume, mountain gradient %, water crossing, cold chain), vehicle compliance documents & maintenance logs, driver records & mountain endorsements, multi-tenant isolation, RBAC capability gating, and structured audit logging.

### Phase 10: Shipments + Trips Operations
25. 📦 **[Shipments & Trips Operational Architecture](./docs/shipments-trips-operations.md)**: Production-grade Shipment and Trip lifecycle engines (10-state Trip machine, cold-chain temperature thresholds, multi-leg stop progress, automatic dispatch assignment, tenant boundary defense, and tamper-evident SHA-256 audit trails).

### Phase 11: Maps + Routing Architecture
26. 🗺️ **[Maps & Routing Architecture](./docs/maps-routing-architecture.md)**: Production-grade spatial routing engine, dual-tier geocoding (Nominatim + Northeast Indian Gazetteer with 16 curated strategic hubs), multi-criteria OSRM routing with offline fallback to topological Mountain Graph, commercial vehicle physical restriction filtering (gradient %, width, height, gross weight), multi-destination distance matrices, cryptographic SHA-256 provenance hashes, and immutable audit logging.

### Phase 12: Weather Engine
27. 🌦️ **[Meteorological & Weather Engine Architecture](./docs/weather-engine-architecture.md)**: Production-grade multi-tier weather provider integration (IMD, Open-Meteo, regional meteorological radars), high-resolution spatial grid interpolation across Northeast India, road weather risk index scoring, flash flood, landslide, fog, and torrential rain forecasting, cold-chain ambient exposure alerts, resilient multi-tier caching (Redis/In-Memory), graceful fallback to historical climatological baselines, and tamper-evident audit logging.

### Phase 13: GPS Telemetry Ingestion
28. 📡 **[GPS Telemetry Ingestion Architecture](./docs/gps-telemetry-architecture.md)**: High-throughput GPS telemetry ingestion pipeline, Kalmar/Haversine map-matching to corridor polyline geometry, Kalman temporal smoothing, physical plausibility filters (max speed 120 km/h, valid NER coordinates), dead reckoning through communication blackouts, real-time geofence arrival/departure detection, driver idle detection, battery & signal telemetry metrics, tenant isolation, and tamper-evident audit logging.

### Phase 14: Northeast Regional Data Ingestion
29. 📥 **[NER Regional Data Ingestion Architecture](./docs/ner-data-ingestion-architecture.md)**: Multi-source automated regional data ingestion pipeline (BRO road closures, CWC river water gauge levels, IMD heavy rainfall alerts, state disaster management bulletins), geo-spatial polygon & point extraction, automated conflict resolution, multi-tier deduplication, exponential backoff retries with circuit breakers, tenant-isolated data feeds, and tamper-evident audit logging.

### Phase 15: Production Risk Engine
30. ⚠️ **[Production Risk Engine Architecture](./docs/production-risk-engine-architecture.md)**: Dynamic multi-factor risk assessment engine calculating composite risk scores (0–100) across 5 core risk vectors: Terrain Gradient & Mountain Curvature (25%), Real-Time Weather & Monsoon Severity (25%), Road Surface & Geological Vulnerability (25%), Vehicle Chassis & Cold-Chain Suitability (15%), and Driver Fatigue & Mountain Endorsement (10%). Incorporates real-time hazard proximity buffer queries, historical landslide risk indices, proactive detour recommendations, tenant isolation, and tamper-evident audit logging.

### Phase 16: Accessibility Intelligence Engine
31. ♿ **[Accessibility Intelligence Engine Architecture](./docs/accessibility-engine-architecture.md)**: Production-grade accessibility engine for Northeast India, authoritative administrative declarations (`accessibility_declarations`), corridor passability & bottleneck assessment, road surface condition & steep gradient ($>12\%$) 4WD ingress profiling, isolation status tracking, uncertainty and temporal freshness decay ($\le 12$h FRESH, $> 48$h STALE), zero-fabrication fallback for unobserved locations (strict `UNKNOWN`), multi-tenant RBAC enforcement (`data:read`, `data:ingest`), and tamper-evident audit logging.

### Phase 17: Constrained Logistics Optimization Engine
32. ⚡ **[Constrained Logistics Optimization Engine Architecture](./docs/optimization-engine-architecture.md)**: Production-grade combinatorial logistics optimization engine for Northeast India, solving multi-vehicle CVRP and VRPTW with time windows, multi-dimensional vehicle constraints (payload kg, volume m³, gradient %, cold-chain refrigeration), driver safety constraints (duty status, mountain endorsement, experience years), route terrain constraints, priority-weighted objective optimization, zero-fabrication invariant on infeasible runs, mandatory human approval workflow (`PENDING_APPROVAL` -> `APPROVED` -> `APPLIED`), and tamper-evident audit logging.

### Phase 18: AI Agent Architecture
33. 🤖 **[AI Agent Architecture](./docs/ai-agent-architecture.md)**: Production-grade multi-agent architecture using cyclical LangGraph state machines, specialized enterprise agents (`RISK_TRIAGE_AGENT`, `AUTONOMOUS_DETOUR_AGENT`, `DEMAND_ALLOCATOR_AGENT`), zero factual fabrication invariant ("AI reasons, APIs provide facts, Algorithms calculate, Backend enforces, Humans approve critical decisions"), strict tool authorization gating over domain services, mandatory human checkpoint gates (`HUMAN_APPROVAL_PENDING` -> `APPROVED` / `REJECTED`), cryptographic SHA-256 state provenance chaining, 1536-dimensional memory vector embeddings, token/INR cost controls, and tamper-evident audit logging.

### Phase 19: Dynamic Replanning Architecture
34. 🔄 **[Dynamic Replanning Architecture](./docs/dynamic-replanning-architecture.md)**: Dynamic trip and corridor replanning engine reacting to real operational changes (GPS off-route deviation $>500$m, forward road blockages $<10$km, risk surges, severe weather warnings), vehicle chassis & gradient ($>14\%$) physical constraint validation, non-silent mutation invariant, deterministic delta explanations, cryptographic SHA-256 state hashing, human dispatcher approval workflow (`PENDING_APPROVAL` $\to$ `APPROVED` / `REJECTED`), automated route versioning ($N \to N+1$), tenant isolation, and tamper-evident audit logging.

### Phase 20: Alerts & Notifications Architecture
35. 📢 **[Alerts & Notifications Architecture](./docs/alerts-notifications-architecture.md)**: Real-time operational alerting and multi-channel notification engine (Firebase Cloud Messaging v1 Push, Dispatcher In-App broadcast, SMS/Email fallback), multi-level severity hierarchy (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), intelligent deduplication preventing alarm fatigue within temporal cooldown windows (10 min), resilient exponential backoff retry subsystem, human acknowledgement and escalation lifecycle (`ACKNOWLEDGE`, `ESCALATE`, `RESOLVE`, `DISMISS`), strict multi-tenant boundary protection, cryptographic SHA-256 state provenance, and tamper-evident audit logging.

### Phase 21: Production Analytics
36. 📈 **[Analytics Architecture](./docs/analytics-architecture.md)**: Production-grade operational analytics engine calculated directly from real system data (Trips, Shipments, Fleet Vehicles, Drivers, Risk Events, Corridor Routes), zero-fabrication invariant, explicit empty and insufficient data state handling, multi-tenant isolation, role-based access control, SHA-256 cryptographic provenance hashing, flexible date presets (7D, 30D, 90D, custom), multi-interval aggregation (DAILY, WEEKLY, MONTHLY), and RFC 4180 CSV / structured JSON export.

### Phase 22: Security Hardening
37. 🛡️ **[Security Hardening & Vulnerability Remediation Report](./docs/security-hardening-report.md)**: Production-grade security hardening pass across authentication, authorization, rate limiting (AUTH: 5 req/min, MUTATING_API: 60 req/min), HTTP security headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff), CORS origin whitelisting & CSRF origin defenses, safe file & document upload validation, production secret invariants, demo account suppression in production, and recursive PII/credential redaction in structured logging.

### Phase 23: Observability
38. 📊 **[Production Observability Architecture](./docs/observability-architecture.md)**: OpenTelemetry-compliant observability engine across web, mobile, and backend tiers; distributed W3C TraceContext propagation (`traceparent`), multi-dimensional metrics registry (Counters, Gauges, Histograms with p50/p90/p95/p99 latency quantiles), Prometheus text exposition endpoints (`/api/v1/observability/metrics`), Edge Middleware request correlation (`X-Correlation-ID`, `X-Request-ID`), specialized subsystem telemetry wrappers (AI agent tokens, OR-Tools solver duration, GPS ingestion rates, external feeds), multi-tier health checks (Liveness, deep Readiness with live SQLite ping and readiness score, Metrics probes), administrative diagnostic snapshots, and automated zero-leakage sensitive data masking.

### Phase 24: Comprehensive Testing & AI Evaluation
39. 🧪 **[Testing Strategy & AI System Evaluation Engine Architecture](./docs/testing-and-ai-evaluation.md)**: Production-grade quality verification and 8-dimension AI system evaluation suite covering Factual Grounding, Tool Usage, Structured Output Schema Conformance, Tool Authorization & Least Privilege, Hallucination Resistance & Adversarial Robustness, Cryptographic Provenance Chaining, Physical Safety Bounds, and Human Approval Boundaries. Complete test matrix across 26 test suites (407 tests passing with 100% success rate), covering unit, integration, API, database, authorization, tenant isolation, frontend SSR, driver mobile, routing, GPS ingestion, risk, accessibility, optimization, notifications, analytics, security hardening, and failure resiliency scenarios.

### Phase 25: Staging Environment Parity & Verification
40. 🚀 **[Staging Environment Guide](./docs/staging-environment-guide.md)**: Production-parity staging environment architecture, network topology, port isolation (PostgreSQL PostGIS on 5433, Redis 7 on 6381, Web on 3001), strict environment invariants via Zod schema, zero-fabrication and zero-leakage standards (`[STAGING_TEST_DATA]`), database migration runner with SHA-256 state checksums, transactional rollback strategy runbook, mobile Expo/EAS staging profile configuration, and GitHub Actions CI/CD deployment pipeline with automated readiness smoke test and rollback.
41. 📋 **[Staging Readiness & Verification Report](./docs/staging-readiness-report.md)**: Comprehensive staging readiness matrix and acceptance checklist across all 13 operational domains (Authentication, Authorization, REST APIs, Database Migrations, Routing, GPS Telemetry, Ingestion, Risk Engine, Accessibility, Optimization, AI Agents, Notifications, Analytics) with 100% pass rate across 27 test suites and 428 automated tests.

### Phase 26: Controlled Field Pilot
42. 🏔️ **[Controlled Field Pilot Operational Guide](./docs/pilot-operational-guide.md)**: Operational guide for bounded field pilot trials across selected state government departments (Assam Food & Civil Supplies, Meghalaya PWD) and mountain corridors (NH-27, NH-29, NH-6). Details cohort authorization guards, in-field driver/dispatcher feedback channels, L1–L3 incident escalation runbook with 2h–72h SLAs, and 9-vector operational health monitoring.
43. 📋 **[Field Pilot Readiness & Verification Report](./docs/pilot-readiness-report.md)**: Subsystem-by-subsystem pilot readiness matrix across all 13 operational domains (98% readiness score), monitored operational metrics baseline, observed technical issues and immediate fixes, remaining field risk mitigation plan, and acceptance checklist.

### Phase 27: Production Deployment & Operations
44. 🏭 **[Production Deployment & Operations Guide](./docs/production-deployment-guide.md)**: Authoritative production deployment architecture, multi-tier infrastructure separation (Next.js web on Vercel/App Service, persistent telemetry & optimization workers on AKS), domain DNS routing (`ne-routeai.in`, `app.ne-routeai.in`, `api.ne-routeai.in`, `broker.ne-routeai.in`), Azure Key Vault secret management, zero-test-data database migrations (`scripts/production-db-migrate.ts`), continuous WAL archiving to GRS (RTO < 15m, RPO < 1m), automated rollback runbook (`scripts/production-rollback.ts`), and GitHub Actions release pipeline (`.github/workflows/production-deploy.yml`).
45. 📋 **[Production Deployment & Readiness Report](./docs/production-deployment-report.md)**: Formal Phase 27 deployment scorecard across all 13 architectural and operational dimensions (100% readiness score), deployed components catalog, environment and secret verification, PostGIS 3.4 migration checksums, full regression pass (29 test suites, 470 tests), disaster recovery SLA metrics, and final acceptance checklist.

### Phase 28: Continuous Monitoring & Improvement
46. 📈 **[Continuous Monitoring & Improvement Guide](./docs/continuous-monitoring-and-improvement-guide.md)**: Comprehensive long-term operational governance guide covering 18 continuous monitoring vectors, SLO targets and alert thresholds, incident response & 5-Whys root-cause analysis (RCA) runbook, bug fixing & security patch lifecycles, 8-dimension AI evaluation lifecycle, data-quality monitoring, capacity planning, and driver UX ergonomics.
47. 📋 **[Phase 28 Completion Report](./docs/phase-28-completion-report.md)**: Final multi-phase platform completion report covering system status, 18-vector monitoring health, outstanding issues, security status, AI evaluation status, data-quality status, operational risks, maintenance roadmap, and final acceptance checklist.

### Phase 29: Production Readiness Audit & Release
48. 🚀 **[Phase 29 Production Readiness Report](./docs/PHASE-29-PRODUCTION-READINESS-REPORT.md)**: Authoritative end-to-end production readiness audit across all 28 previous phases. Details zero-fabrication verification, full automated regression validation (30 test suites, 490 tests passing 100%), web & mobile TypeScript compilation, production Next.js build verification (45 static pages, 89 dynamic API routes), security review, observability audit, and final release certification.

---

## 🏛️ Target System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT PLATFORMS                               │
│  ┌──────────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │       Next.js 14 Web Platform        │  │ React Native Expo Mobile    │  │
│  │  (Dispatch Radar, Fleet, Analytics)  │  │ (Driver Navigation, SOS)    │  │
│  └──────────────────┬───────────────────┘  └──────────────┬──────────────┘  │
└─────────────────────┼─────────────────────────────────────┼─────────────────┘
                      │ HTTPS / WSS                         │ HTTPS / WSS
┌─────────────────────▼─────────────────────────────────────▼─────────────────┐
│                    API GATEWAY / INGRESS & REVERSE PROXY                    │
│           TLS 1.3 · Rate Limiting · WAF · Auth Validation Proxy             │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                     FASTAPI BACKEND APPLICATION CLUSTER                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ REST & Streaming │  │ OR-Tools Engine  │  │ LangGraph Multi-Agent     │  │
│  │ Endpoints        │  │ (CVRP / VRPTW)   │  │ (Dynamic Detours & Triage)│  │
│  └──────────────────┘  └──────────────────┘  └───────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Provider Abstraction Layer                       │  │
│  │ RoutingService · WeatherService · AuthService · NotificationService   │  │
│  │ StorageService · AIService · GeocodingService                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
┌──────────────────────▼──────────────┐   ┌────────────▼──────────────────────┐
│     REDIS 7 IN-MEMORY STREAMING     │   │      ASYNCHRONOUS WORKERS         │
│  - Telemetry Stream Buffer (GPS)    │   │  - Distributed Celery / Arq       │
│  - Pub/Sub Radar Event Dispatch     │   │  - Satellite Weather Polygons     │
│  - Distributed Route Lock Manager   │   │  - Multi-Depot Route Solver       │
└──────────────────────┬──────────────┘   └────────────┬──────────────────────┘
                       │                               │
┌──────────────────────▼───────────────────────────────▼──────────────────────┐
│                  PERSISTENCE: POSTGRESQL 16 + POSTGIS 3.4                   │
│  ┌────────────────────────┐ ┌───────────────────────┐ ┌──────────────────┐  │
│  │ Core Relational Schema │ │ PostGIS Spatial Engine│ │ pgvector Engine  │  │
│  │ (Multi-Tenant RLS)     │ │ (ST_DWithin, Buffers) │ │ (Incident Embeds)│  │
│  └────────────────────────┘ └───────────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Role-Based Access Control (RBAC)

The target architecture defines 6 strict operational roles:
- **`SUPER_ADMIN`**: Global platform administrator; cross-tenant disaster coordination.
- **`ORG_ADMIN`**: Organization administrator managing organization users, vehicles, and facilities.
- **`DISPATCHER`**: Operations controller managing active shipments, routes, and alert triage.
- **`LOGISTICS_MANAGER`**: Fleet and supply chain manager overseeing vehicle health and compliance.
- **`DRIVER`**: Mobile app operator executing assigned trips, GPS pings, and incident reporting.
- **`VIEWER`**: Read-only observer for regulatory bodies and civilian monitoring.

---

## 🗺️ Geographic Coverage (All 8 NER States)

| State | Reference Hubs | Max Elevation | Primary Highway Corridors | Hazard Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Assam** | Guwahati, Tezpur, Silchar, Dibrugarh | 116m | NH-27, NH-37, NH-6 | Brahmaputra flash floods & river breaches |
| **Arunachal Pradesh**| Itanagar, Bomdila, Tawang, Pasighat | 3048m | NH-13, Trans-Arunachal Highway | Snowbound passes, heavy rockfalls |
| **Nagaland** | Kohima, Dimapur, Mokokchung | 1444m | NH-29 | Active landslide sinking zones (Zubza) |
| **Manipur** | Imphal, Churachandpur, Senapati | 1680m | NH-2, NH-37 | Single-lane gorge bridges, mudslips |
| **Meghalaya** | Shillong, Tura, Cherrapunji | 1496m | NH-6, NH-106 | Extreme precipitation & blinding fog |
| **Mizoram** | Aizawl, Lunglei | 1133m | NH-54, NH-306 | Ridge-line single lane roads |
| **Tripura** | Agartala, Udaipur | 13m | NH-8 | Riverine plains & transit chokepoints |
| **Sikkim** | Gangtok, Mangan | 1650m | NH-10 | Teesta river valley flash floods |

---

## 🧪 Verification & Development

### 1. Prerequisites
- Node.js 18.17+ or 20+
- npm 9+
- Docker & Docker Compose (optional for local multi-service composition)

### 2. Local Setup
```bash
git clone <repo-url> ne-routeai-next
cd ne-routeai-next
npm install
cp .env.development .env.local
```

### 3. Run Automated Tests
```bash
npm test
```
*Executes all unit, spatial, architectural contract tests, and infrastructure validation suites.*

### 4. Run TypeScript Typecheck
```bash
npm run typecheck
```

### 5. Production Build
```bash
npm run build
```

### 6. Local Multi-Service Orchestration (Docker Compose)
To start Next.js, PostgreSQL 16 + PostGIS, and Redis 7 locally:
```bash
docker compose up -d
```
Health Check Endpoints:
- Liveness: `http://localhost:3000/api/health`
- Deep Readiness: `http://localhost:3000/api/health?probe=readiness`

---

## 🔒 Security & Data Sovereignty
- **Data Residency**: All infrastructure and spatial data reside exclusively within Indian sovereign cloud regions (Pune/Chennai).
- **Audit Immutability**: All dispatches and route overrides write to an immutable, SHA-256 hash-chained audit log.
- **Compliance**: Full alignment with India's **Digital Personal Data Protection Act (DPDP Act 2023)**.

---

## 📄 License
Enterprise software engineered for state logistics authorities, disaster management agencies (NDRF/SDMA), and defense transport infrastructure. All rights reserved.
