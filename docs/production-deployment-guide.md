# AuraNER / NER-Route AI — Production Deployment & Operations Guide (Phase 27)

## 1. Executive Summary & Production Topology

This document specifies the authoritative deployment, infrastructure configuration, secret management, and disaster recovery procedures for **AuraNER / NER-Route AI** in **Production (PROD)**.

The production runtime enforces strict architectural separation:
1. **Frontend & Edge Gateway**: Next.js 14 Web Portal hosted with SSR/ISR on Vercel Enterprise or Azure App Service, served globally behind Cloudflare / Azure Front Door with TLS 1.3 and HSTS.
2. **Persistent Backend & Workers**: Long-running telemetry ingestion streams, Kalman filter dead reckoning, Celery / Redis Streams task queues, and mountain CVRP/VRPTW optimization solvers deployed on persistent container infrastructure (Azure Kubernetes Service / Container Apps) in Azure Central India (Pune).
3. **Spatial Relational Database**: PostgreSQL 16 + PostGIS 3.4 (Azure Database for PostgreSQL Flexible Server) in Zone-Redundant High Availability configuration with continuous WAL archiving to Geo-Redundant Storage (GRS).
4. **In-Memory Cache & Streams**: Redis 7 Enterprise Cluster for real-time telematics buffering, distributed locks, and session caching.

```
                              [ Internet / Dispatchers / Mobile Apps ]
                                                 │
                                                 ▼
                             [ Azure Front Door / Cloudflare Edge ]
                                WAF, DDoS Shield, TLS 1.3, HSTS
                                                 │
                     ┌───────────────────────────┴───────────────────────────┐
                     ▼                                                       ▼
      [ Next.js 14 Web Portal ]                             [ Persistent Backend Cluster ]
      Vercel / Azure App Service (Pune)                     Azure Kubernetes Service (AKS)
      https://app.ne-routeai.in                             https://api.ne-routeai.in
      - Operations Portal & Dispatch Board                  - High-throughput GPS Telemetry (MQTT/REST)
      - RBAC Session & Route Planning                       - Dead Reckoning Kalman Filtering
      - Real-Time GIS MapLibre Visualizer                   - Mountain CVRP/VRPTW Solver Daemon
                     │                                                       │
                     └───────────────────────────┬───────────────────────────┘
                                                 │ (Private VNet Peering)
                     ┌───────────────────────────┼───────────────────────────┐
                     ▼                           ▼                           ▼
      [ PostgreSQL 16 + PostGIS 3.4 ]  [ Redis 7 Streams ]          [ Azure Blob Storage ]
      Flexible Server (Zone Redundant)  Enterprise Cluster (Pune)    ZRS (Pune) + GRS (Chennai)
      Port 5432 (SSL Enforced)         Port 6380 (TLS Enforced)     Document & Tile Store
```

---

## 2. Production Domain & DNS Architecture

All production traffic routes across dedicated domains secured by DNSSEC and TLS 1.3:

| Hostname | Target Service | Ingress Type | Protocols | Security Policy |
| :--- | :--- | :--- | :--- | :--- |
| **`ne-routeai.in`** | Marketing & Documentation Root | Global Anycast Edge | HTTPS | HSTS (`max-age=63072000; preload`) |
| **`app.ne-routeai.in`** | Next.js Web Operations Portal | Vercel Enterprise / App Service | HTTPS, WSS | CSP, X-Frame-Options: DENY, HSTS |
| **`api.ne-routeai.in`** | Persistent Backend Gateway | Azure Application Gateway | HTTPS | Bearer JWT, Rate Limited (100 req/s) |
| **`broker.ne-routeai.in`** | MQTT Telemetry Ingestion Broker | AKS Ingress / Azure IoT Hub | MQTTS (Port 8883) | Mutual TLS / Client Token Authentication |

---

## 3. Secret Management & Runtime Injection

Production secrets are **never** committed to version control, stored in plaintext, or baked into Docker container images.

### Key Vault Injection Topology:
- **Managed Identity Integration**: Container runtimes (AKS pods, Container Apps) bind to Azure Managed Identities (`id-auraner-prod-service`) authorized via RBAC to read secrets directly from **Azure Key Vault (`kv-auraner-prod`)**.
- **Zero-Secret Leaking Standard**:
  - `ALLOW_MOCK_PROVIDERS` must be strictly set to `false`.
  - Default development keys (`ner-routeai-secret-key-sih-2024-production`) trigger an immediate application startup crash via `src/lib/env.ts` Zod validation.
  - Runtime environment introspection (`getProductionInfo()`) strips all cryptographic secrets, connection strings, and passwords.

---

## 4. Production Database Migration Runbook

Database migrations are executed via `scripts/production-db-migrate.ts`.

### Migration Execution Procedure:
```bash
# 1. Pre-flight verification and schema dry-run:
npx tsx scripts/production-db-migrate.ts --dry-run

# 2. Live production migration execution:
npx tsx scripts/production-db-migrate.ts
```

### Safety & Integrity Invariants:
1. **Zero-Test-Data Guard**: Prohibits any test fixtures, synthetic users, or `[STAGING_TEST_DATA]` markers from being inserted into production.
2. **Cryptographic Checksum Verification**: Every migration file (`0001_init.sql`, `0002_domain_expansion.sql`) has its SHA-256 hash verified before execution.
3. **Expand / Contract Compatibility**: Columns and tables are expanded non-destructively; no breaking table locks are acquired during traffic hours.

---

## 5. Persistent Backend & Workers Deployment (AKS)

While Next.js handles serverless web delivery on Vercel, persistent workloads are deployed to Azure Kubernetes Service:

### Workload Separation:
1. **Telemetry Ingestion Worker**: Subscribes to Redis Streams / MQTT topics (`auraner/telemetry/prod/#`), applies physical velocity filtering ($\le 120\text{ km/h}$), and writes batched checkpoints to PostGIS every 3 seconds.
2. **Dynamic Replanning & Risk Daemon**: Monitors IMD radar and BRO road advisories, re-evaluates route risk every 60 seconds, and generates human-approval replanning proposals for critical landslides.
3. **Mountain Optimization Engine**: Executes heavy CVRP/VRPTW hill-climbing algorithms with dedicated CPU reservation (2.0 vCPU, 4GB RAM per worker pod).

---

## 6. Backup & Disaster Recovery Architecture

The platform guarantees strict **Business Continuity SLAs**:
- **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ for failover to secondary Indian region (Chennai).
- **Recovery Point Objective (RPO)**: $< 1\text{ minute}$ via continuous PostgreSQL Write-Ahead Log (WAL) archiving to Geo-Redundant Storage (GRS).
- **Snapshot Policy**: Daily full automated snapshot retained for 35 days with weekly automated recovery drill execution.

### Backup Verification Runbook:
```bash
# Verify production backup and disaster recovery readiness:
npx tsx scripts/production-backup.ts
```

---

## 7. Blue/Green Zero-Downtime Deployment & Rollback Runbook

### Blue/Green Release Flow:
1. New production image tagged with Git SHA (`auraner-web:<SHA>`) is deployed to the idle **Green slot**.
2. Automated health checks execute against Green: `GET https://green.ne-routeai.in/api/health/ready`.
3. If readiness score $\ge 90\%$, Azure Front Door / Application Gateway shifts 100% of user traffic to Green.
4. Blue slot remains warm for 60 minutes as immediate rollback standby.

### Automated & Manual Rollback Execution:
If post-deployment smoke tests fail or operational error rate exceeds $1.0\%$:
```bash
# 1. Trigger automated traffic revert to Blue slot:
az network front-door routing-rule update ... --route-to blue

# 2. Plan schema reversal (if required):
npx tsx scripts/production-rollback.ts --target 0001_init

# 3. Verify health after rollback:
curl -f https://app.ne-routeai.in/api/health/ready
```

---

## 8. Continuous Deployment Pipeline (`.github/workflows/production-deploy.yml`)

The production pipeline enforces 5 sequential deployment gates:
1. **Gate 1 (Quality & Security)**: TypeScript (web + mobile), ESLint, Vitest (451+ tests), Next.js production build.
2. **Gate 2 (Database Migration)**: Dry-run and live schema checksum verification.
3. **Gate 3 (Multi-Target Deployment)**: Vercel frontend release + AKS persistent worker deployment.
4. **Gate 4 (Automated Smoke Test)**: Automated probes against `/api/health` and `/api/health/ready`.
5. **Gate 5 (Auto-Rollback Guard)**: Automatic traffic reversion if smoke tests fail.
