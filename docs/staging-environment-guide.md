# AuraNER / NER-Route AI — Staging Environment Guide (Phase 25)

## 1. Executive Summary & Purpose

The Staging Environment provides an isolated, production-parity infrastructure runtime for **AuraNER / NER-Route AI**. It mirrors production network topology, database extensions (PostGIS 3.4 on PostgreSQL 16), Redis cache architecture, cryptographic session verification, and multi-tenant security guarantees without using production credentials or mixing operational records.

---

## 2. Infrastructure Topology & Port Allocation

Staging runs on isolated dedicated ports to ensure zero interference with local development servers and production environments:

| Component | Technology | Staging Port | Production Equivalent | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend & API Gateway** | Next.js 14 / Node.js 20 | `3001` | `443` (`staging.ne-routeai.in`) | Web Portal & REST API Server |
| **Relational & Spatial DB** | PostgreSQL 16 + PostGIS 3.4 | `5433` | Managed PostGIS on Cloud | Multi-tenant relational & geospatial database |
| **In-Memory Cache & Telemetry** | Redis 7.2 Alpine | `6381` | Managed Redis Cluster | Pub/Sub, live telemetry buffer & rate-limits |
| **External Routing Engine** | OSRM / Custom Hill Engine | `5000` | High-Availability Cluster | Mountain route geometry & elevation profiling |

```
                                  [ Staging Ingress ]
                               https://staging.ne-routeai.in
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
             [ Web Portal UI ]                           [ Mobile Driver App ]
             Port 3001 (Next.js)                         EAS Staging Profile
                      │                                           │
                      └─────────────────────┬─────────────────────┘
                                            │
                                  [ Next.js API Layer ]
                                            │
                       ┌────────────────────┼────────────────────┐
                       ▼                    ▼                    ▼
             [ PostgreSQL 16 + PostGIS ] [ Redis 7 Cache ] [ OSRM Routing Engine ]
             Port 5433 (`ner_routeai_staging`) Port 6381       Port 5000
```

---

## 3. Staging Configuration & Environment Invariants

The staging runtime is configured via `.env.staging` (excluded from version control via `.gitignore`). 

### Invariants Enforced by `src/lib/env.ts` Zod Schema:
1. **HTTPS Enforcement**: In `staging` and `production`, `NEXT_PUBLIC_APP_URL` MUST use `https://`. Insecure `http://` configurations are rejected at boot time.
2. **Cryptographic JWT Secret Rejection**: The default development secret (`ner-routeai-secret-key-sih-2024-production`) is explicitly rejected. Staging mandates an isolated 256-bit cryptographic key (`JWT_SECRET`).
3. **Database Isolation Guard**: Staging `DATABASE_URL` is prohibited from targeting production hostnames or databases.
4. **Mock Provider Safety**: `ALLOW_MOCK_PROVIDERS` is set to `false` to ensure staging validates real domain service contracts.

---

## 4. Test Data Isolation & `[STAGING_TEST_DATA]` Standard

To uphold the **Zero-Fabrication & Zero-Leakage Invariants**:
- **Strict Prefix Requirement**: Every fixture, mock user, test organization, driver, vehicle, and hazard seeded in staging MUST include the `[STAGING_TEST_DATA]` prefix in human-readable names.
- **Dedicated Staging Namespaces**: Staging organizations use dedicated namespace IDs (e.g., `org_staging_assam_civil_supplies`, `org_staging_meghalaya_pwd`).
- **Cryptographic Separation**: Staging JWT tokens signed by staging keys are rejected by production token verifiers.

---

## 5. Staging Migration Runner & Schema Integrity

### Execution:
```bash
# Execute staging database migrations and seed fixtures:
npx tsx scripts/staging-db-migrate.ts

# Execute migration dry-run:
npx tsx scripts/staging-db-migrate.ts --dry-run
```

### Migration Integrity Verification:
- Verifies PostGIS 3.4 extension availability (`postgis`, `postgis_topology`).
- Validates SQL migration files (`0001_init.sql`, `0002_domain_expansion.sql`).
- Calculates SHA-256 state hashes across all migration files to guarantee deterministic schema state.
- Seeds isolated staging organizations, vehicles, drivers, facilities, and regional road bulletins.

---

## 6. Staging Rollback Strategy & Runbook

### Rollback Runner:
```bash
# Plan rollback down to baseline:
npx tsx scripts/staging-rollback.ts --target 0001_init

# Execute live rollback with post-rollback verification:
npx tsx scripts/staging-rollback.ts --target 0001_init --execute
```

### Rollback Safety Sequence:
1. **Pre-Rollback State Audit**: Computes SHA-256 checksum of current database state and verifies WAL snapshot status.
2. **Dependency Tree Traversal**: Resolves reverse dependency graph for tables scheduled for migration reversal.
3. **Foreign Key Constraint Decoupling**: Disables referential integrity triggers safely within an isolated transaction.
4. **Target Version Reversal**: Executes down-migration scripts in reverse chronological order.
5. **Post-Rollback Health & Readiness Check**: Automatically queries `/api/health/ready` to verify system health.

---

## 7. Mobile Staging Configuration (EAS & Expo)

Mobile driver applications support staging via dedicated Expo configuration (`mobile/app.json`) and EAS build profiles (`mobile/eas.json`):

### EAS Build Command:
```bash
# Build Android APK for staging:
eas build --profile staging --platform android

# Build iOS Archive for staging TestFlight:
eas build --profile staging --platform ios
```

### Dynamic Configuration Resolution (`mobile/src/services/config.ts`):
- `development`: `http://10.0.2.2:3000/api/v1` (Android Emulator) / `http://localhost:3000/api/v1`
- `staging`: `https://staging.ne-routeai.in/api/v1`
- `production`: `https://app.ne-routeai.in/api/v1`

---

## 8. Continuous Deployment Pipeline (`.github/workflows/staging-deploy.yml`)

The automated staging CI/CD workflow triggers on every push to `staging` branch or release PR:

1. **Quality Gate**:
   - TypeScript compilation (`tsc --noEmit` + mobile typecheck).
   - ESLint static analysis.
   - Vitest automated test suite (428+ tests across 27 suites).
2. **Database Migration Gate**:
   - Spins up ephemeral PostgreSQL 16 + PostGIS 3.4 container.
   - Executes `scripts/staging-db-migrate.ts`.
3. **Containerization**:
   - Builds multi-stage Docker image tagged with Git SHA and `staging-latest`.
   - Pushes to container registry.
4. **Staging Host Deployment**:
   - Pulls and deploys containers via `docker-compose.staging.yml`.
5. **Automated Smoke Test & Auto-Rollback**:
   - Executes HTTP GET against `/api/health/ready`.
   - Verifies HTTP 200 and `readiness_score_pct >= 80`.
   - If probe fails, automatically deploys previous healthy image SHA and issues PagerDuty/Slack escalation.
