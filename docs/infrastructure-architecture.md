# AuraNER / NER-Route AI — Production Infrastructure Architecture

## 1. Executive Infrastructure Topology

The **NER-Route AI** platform infrastructure is engineered for high availability (99.9% uptime SLA), disaster recovery across Indian cloud zones, and multi-tenant spatial computing.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               AZURE CENTRAL INDIA (PUNE) REGION                             │
│                                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    VIRTUAL NETWORK (VNet: 10.0.0.0/16)                                │  │
│  │                                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ PUBLIC SUBNET (10.0.1.0/24) — INGRESS TIER                                      │  │  │
│  │  │  ┌───────────────────────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ Azure Application Gateway v2 / WAF (TLS 1.3, DDoS Protection, Rate Limiting│  │  │  │
│  │  │  └──────────────────┬─────────────────────────────────────┬──────────────────┘  │  │  │
│  │  └─────────────────────┼─────────────────────────────────────┼─────────────────────┘  │  │
│  │                        │                                     │                        │  │
│  │  ┌─────────────────────▼─────────────────────────────────────▼─────────────────────┐  │  │
│  │  │ APPLICATION SUBNET (10.0.2.0/24) — PRIVATE COMPUTE TIER                         │  │  │
│  │  │  ┌─────────────────────────────────┐   ┌─────────────────────────────────────┐  │  │  │
│  │  │  │ Next.js Web Cluster (Port 3000) │   │ FastAPI Backend Cluster (Port 8000) │  │  │  │
│  │  │  │ (Next.js 14 SSR, Vector Radar)  │   │ (OR-Tools, LangGraph, GeoAlchemy2)  │  │  │  │
│  │  │  └─────────────────────────────────┘   └──────────────────┬──────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────────────┼─────────────────────┘  │  │
│  │                                                              │                        │  │
│  │  ┌───────────────────────────────────────────────────────────▼─────────────────────┐  │  │
│  │  │ DATA SUBNET (10.0.3.0/24) — ISOLATED PERSISTENCE TIER                           │  │  │
│  │  │  ┌──────────────────────────────┐        ┌───────────────────────────────────┐  │  │  │
│  │  │  │ Azure Flexible Server PG 16  │        │ Azure Cache for Redis 7 (Premium) │  │  │  │
│  │  │  │ (PostGIS 3.4, pgvector)      │        │ (Redis Streams, Redlock)          │  │  │  │
│  │  │  └──────────────────────────────┘        └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                             │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────┐  │
│  │ Azure Key Vault (Secrets)    │  │ Azure Blob Storage (ZRS)     │  │ Azure Monitor    │  │
│  │ (Managed Service Identity)   │  │ (Documents, e-POD Signatures)│  │ (App Insights)   │  │
│  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingress & Traffic Management

1. **Edge TLS & WAF**:
   - TLS 1.3 enforced with forward secrecy ciphers; TLS 1.0 and 1.1 disabled.
   - Web Application Firewall (WAF) enabled with OWASP ModSecurity Core Rule Set (CRS 3.2).
   - Rate limiting: 100 requests/second per IP for standard endpoints; 5 requests/minute for authentication endpoints.
2. **Reverse Proxy & Routing Rules**:
   - Paths starting with `/api/v1/` route to the **FastAPI Backend Cluster**.
   - Path `/api/health` routes directly to the application container health probe.
   - All other HTTP traffic routes to the **Next.js Web Frontend** container.
   - Persistent WebSocket connections (`/ws/telemetry`, `/ws/alerts`) bypass HTTP caching and proxy directly to Redis Pub/Sub.

---

## 3. Containerization Strategy (Docker)

### 3.1 Multi-Stage Build Architecture
- **Stage 1 (`deps`)**: Installs production and build dependencies with `npm ci` leveraging layer caching.
- **Stage 2 (`builder`)**: Compiles optimized Next.js server and static assets (`npm run build`).
- **Stage 3 (`runner`)**: Uses minimal Alpine Linux image (`node:20-alpine`), copies only compiled `.next` artifacts and production `node_modules`.
- **Security Hardening**:
  - Non-root user: Executes under UID `1001` (`nextjs:nodejs`).
  - Read-only root filesystem with ephemeral `/tmp` volume mounts.
  - Zero development tools (e.g. `gcc`, `git`, `curl`) bundled into the final image.

### 3.2 Local Infrastructure Orchestration (`docker-compose.yml`)
For local developer onboarding and offline simulation, the repository provides `docker-compose.yml`:
- **`web`**: Next.js frontend running on port 3000.
- **`postgres`**: Official `postgis/postgis:16-3.4-alpine` spatial image initialized with `supabase/migrations/0001_init.sql` and `supabase/seed/dev.sql`.
- **`redis`**: Official `redis:7-alpine` broker running on port 6379 with persistence (`appendonly yes`).

---

## 4. Compute & Scalability Tiers

### 4.1 Next.js Web Frontend Tier
- **Runtime**: Node.js 20 LTS running in containerized Azure App Service / Kubernetes pods.
- **Auto-scaling Policies**:
  - Horizontal Pod Autoscaler (HPA) scales from 2 to 10 replicas based on CPU ($> 70\%$) or active HTTP connections ($> 500$).

### 4.2 FastAPI Computational Backend Tier
- **Runtime**: Python 3.11 with asynchronous Uvicorn workers (4 workers per container).
- **Compute Sizing**: Optimized for compute-intensive Google OR-Tools constraint solving and LangGraph agent execution.
- **Auto-scaling Policies**: Scales from 2 to 16 replicas based on Redis queue depth ($> 50$ pending solver tasks) and CPU utilization ($> 75\%$).

---

## 5. Persistence & In-Memory Storage

### 5.1 Spatial Database (PostgreSQL 16 + PostGIS 3.4)
- **SKU**: Azure Database for PostgreSQL Flexible Server, General Purpose (D8ds_v5, 8 vCPUs, 32 GB RAM, 512 GB Premium SSD).
- **High Availability**: Zone-Redundant High Availability with automated failover within 60 seconds.
- **Spatial Indexes**: GiST indexes on all `geography` and `geometry` columns (`locations.geom`, `routes.geom`, `incidents.geom`, `telemetry.geom`).
- **Connection Pooling**: PgBouncer connection pooler in transaction mode supporting up to 2,000 concurrent client sessions.

### 5.2 In-Memory Broker (Redis 7 Enterprise)
- **Architecture**: Primary/Replica cluster with automated failover and in-memory persistence (`AOF` every second).
- **Use Cases**:
  1. High-throughput GPS Telemetry Streams (`XADD auraner/telemetry/stream`).
  2. Real-time Radar Pub/Sub event broadcasting.
  3. Distributed locks (Redlock algorithm) for route recalculation concurrency control.

---

## 6. Continuous Integration & Delivery (CI/CD)

The CI/CD pipeline is orchestrated via **GitHub Actions** (`.github/workflows/ci.yml`):

1. **Pre-Merge Quality Gate**:
   - Linting check
   - Strict TypeScript compilation (`npm run typecheck`)
   - Vitest test suite (`npm test`: 17/17 tests passing)
   - Production bundle compilation (`npm run build`)
   - Container image build test (`docker build`)
2. **Staging Continuous Deployment**:
   - Automated push to Azure Container Registry (ACR) on merge to `develop`.
   - Automated zero-downtime deployment to Staging Container Apps cluster.
3. **Production Blue/Green Deployment**:
   - Release gated on manual approval from Release Engineer.
   - Blue/Green container swap with automated health verification against `/api/health?probe=readiness`.

---

## 7. Disaster Recovery & Indian Sovereign Cloud Residency

- **Residency Guarantee**: 100% of telemetry, driver PII, and geospatial manifest data is hosted exclusively within sovereign Indian data centers:
  - Primary Region: **Azure Central India (Pune)**.
  - Secondary DR Region: **Azure South India (Chennai)**.
- **Recovery Time Objective (RTO)**: $< 15\text{ minutes}$ for secondary region failover.
- **Recovery Point Objective (RPO)**: $< 1\text{ minute}$ via asynchronous geo-replicated WAL archiving.
