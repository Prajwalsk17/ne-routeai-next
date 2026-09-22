# AuraNER / NER-Route AI — Deployment & DevOps Strategy

## 1. Environment Topology & Matrix

The deployment lifecycle spans three isolated environments: **Development (DEV)**, **Staging (STAGING)**, and **Production (PROD)**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ENVIRONMENT MATRIX                                        │
├───────────────────────┬─────────────────────────┬───────────────────┬───────────────────────┤
│ Tier                  │ Development (DEV)       │ Staging (STAGING) │ Production (PROD)     │
├───────────────────────┼─────────────────────────┼───────────────────┼───────────────────────┤
│ Next.js Web Frontend  │ Vercel Preview / Local  │ Azure App Service │ Azure App Service     │
│ React Native Mobile   │ Expo Go / Local Simulator│ Expo EAS Preview  │ Expo EAS Production   │
│ FastAPI Backend       │ Local Docker / Uvicorn  │ Container Apps    │ Kubernetes (AKS) HA   │
│ PostgreSQL + PostGIS  │ Local Docker / PostGIS  │ Azure PG (Dev SKU)│ Azure PG Flexible HA  │
│ Redis Cache & Streams │ Local Redis 7 Docker    │ Azure Cache Redis │ Redis Enterprise Clust│
│ Object Storage        │ Local MinIO             │ Azure Blob (Dev)  │ Azure Blob ZRS        │
│ Secrets Manager       │ Local .env.local        │ Azure Key Vault   │ Azure Key Vault (Prod)│
│ Telemetry Ingestion   │ Synthetic Mock Stream   │ Dogfood Fleet     │ Live Fleet Telematics │
└───────────────────────┴─────────────────────────┴───────────────────┴───────────────────────┘
```

---

## 2. Containerization Strategy (Docker)

### 2.1 Next.js Multi-Stage Production Dockerfile
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### 2.2 FastAPI Backend Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build & Dependencies
FROM python:3.11-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev gdal-bin libgdal-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final Runtime
FROM python:3.11-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libgdal32 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
COPY ./backend /app
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

---

## 3. Infrastructure as Code (Terraform)

All production infrastructure is declared and provisioned via modular Terraform scripts targeting Azure Central India (Pune):

### 3.1 Key Resource Declarations (`main.tf`)
- **Virtual Network & Subnets**:
  - `azurerm_virtual_network` (10.0.0.0/16)
  - Isolated subnets for Ingress, Application, and Private Database Endpoints.
- **Managed Spatial Database**:
  - `azurerm_postgresql_flexible_server` with High Availability (Zone-Redundant).
  - Pre-installed extensions: `postgis`, `uuid-ossp`, `pgvector`.
- **In-Memory Cache**:
  - `azurerm_redis_cache` (Premium SKU with Redis Streams enabled).
- **Application Cluster**:
  - `azurerm_kubernetes_cluster` (AKS) with auto-scaling node pools (1 to 10 nodes).
- **Key Vault & Secrets**:
  - `azurerm_key_vault` with Managed Identities for secure runtime secret injection.

---

## 4. CI/CD Automation (GitHub Actions)

The deployment pipeline is fully automated using GitHub Actions workflows:

### 4.1 Pipeline Workflow Stages
1. **Pull Request Quality Gate**:
   - Executes linting, TypeScript typechecking, and Vitest test suite.
   - Runs backend pytest unit and spatial tests with PostGIS Testcontainers.
2. **Staging Continuous Deployment (Merge to `develop`)**:
   - Builds and tags Docker container images (`ner-web`, `ner-backend`).
   - Pushes images to Azure Container Registry (ACR).
   - Applies database migrations automatically via Alembic migration runner job.
   - Deploys to Staging Container Apps cluster.
3. **Production Release Gate (Merge to `main` with Release Tag)**:
   - Requires manual approval from Lead Architect / Release Manager.
   - Performs Blue/Green zero-downtime deployment on AKS.
   - Executes smoke tests against `/api/health` and verifies active GIS radar.
   - Automatically rolls back if health checks fail within 120 seconds.

---

## 5. Database Migration Strategy (Alembic + PostGIS)

Database schema evolution is managed via **Alembic** ensuring zero downtime:
- Migrations adhere to the **Expand / Contract pattern**:
  1. *Expand*: Add new columns or tables (nullable or with default values).
  2. *Deploy Application*: Deploy software that reads both old and new columns, writes to new columns.
  3. *Backfill*: Run background worker script to backfill historical records.
  4. *Contract*: Remove deprecated columns in a subsequent release.
- All spatial column migrations use explicit SRID specifications:
  ```python
  from geoalchemy2 import Geometry
  op.add_column('routes', sa.Column('geom', Geometry(geometry_type='LINESTRING', srid=4326)))
  ```

---

## 6. Observability, Monitoring & Alerting

### 6.1 Telemetry & Distributed Tracing
- **OpenTelemetry Instrumentation**: Automatically traces HTTP requests across the Next.js web application, API gateway, and FastAPI backend services.
- **Trace Propagation**: Standard `traceparent` headers injected on all inter-service and WebSocket communications.
- **Application Insights / Azure Monitor**: Unified dashboard for latency metrics, error rates, CPU/Memory utilization, and Redis buffer depth.

### 6.2 Application Health Checks
- **Liveness Endpoint (`GET /api/health`)**: Returns `HTTP 200 { status: "ok" }` if the process is responsive.
- **Readiness Endpoint (`GET /api/health/ready`)**: Verifies active connectivity to:
  - PostgreSQL database connection pool (`SELECT 1`).
  - Redis cache ping (`PING`).
  - Spatial PostGIS extension check (`SELECT PostGIS_Version()`).

### 6.3 Operational Incident Alerting
- **Alert Rules**:
  - API error rate $> 1.0\%$ for $> 3\text{ minutes}$ triggers PagerDuty / On-Call alert.
  - GPS Telemetry stream lag $> 30\text{ seconds}$ triggers high-priority ingestion warning.
  - Route Recalculation solver duration P95 $> 3.0\text{ seconds}$ triggers performance alert.

---

## 7. Disaster Recovery & Backup Strategy

- **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ for failover to secondary Indian region.
- **Recovery Point Objective (RPO)**: $< 1\text{ minute}$ via continuous PostgreSQL Write-Ahead Log (WAL) archiving to Geo-Redundant Storage (GRS).
- **Daily Automated Backups**: Retained for 35 days with automated weekly restoration verification drills.
