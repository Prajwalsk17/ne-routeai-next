# AuraNER / NER-Route AI — Dependency Strategy & Management

## 1. Overview & Strategy Principles

The dependency strategy ensures high performance, maintainability, supply-chain security, and seamless interoperability across the three primary application tiers:
1. **Next.js Web Frontend** (Operator Dispatch & Command Portal)
2. **React Native Expo Mobile Application** (Driver Navigation & Field Telemetry)
3. **FastAPI Backend Services** (Spatial Computing, Optimization, & AI Orchestration)

---

## 2. Web Platform Dependency Strategy (Next.js / TypeScript)

### 2.1 Core Runtime Dependencies
| Package | Recommended Version | Justification & Role |
| :--- | :--- | :--- |
| `next` | `^14.2.0` | React server components, optimized static/dynamic hybrid rendering, edge middleware. |
| `react` & `react-dom` | `^18.3.0` | Stable client and server component rendering lifecycle. |
| `typescript` | `^5.5.0` | Strict type safety across all domain entities, API envelopes, and GIS structures. |
| `maplibre-gl` | `^4.7.0` | Hardware-accelerated vector map engine; zero licensing fees; native GeoJSON styling. |
| `lucide-react` | `^0.400.0` | Modern, consistent iconography for logistics, status badges, and GIS layers. |
| `framer-motion` | `^11.0.0` | Fluid micro-interactions for wizard steps, slide-out drawer panels, and alert pulses. |
| `zod` | `^3.23.8` | Declarative, schema-based request validation and runtime contract enforcement. |
| `zustand` | `^4.5.0` | Lightweight client state management for UI preferences, filter toggles, and radar state. |

### 2.2 Development & Quality Tooling
| Package | Recommended Version | Justification & Role |
| :--- | :--- | :--- |
| `vitest` | `^2.1.0` | High-speed unit and integration test runner with native ES modules and path alias support. |
| `tailwindcss` | `^3.4.0` | Modern utility-first CSS framework with tailored HSL design tokens. |
| `eslint` | `^8.57.0` | Standard JavaScript/TypeScript static analysis. |
| `eslint-config-next` | `14.2.0` | Official Next.js linting rules enforcing Core Web Vitals and SSR best practices. |

### 2.3 Legacy Packages Scheduled for Decommission
- **`better-sqlite3` & `@types/better-sqlite3`**: Currently used for local/serverless fallback in `src/lib/db.ts`. To be completely removed once the application connects directly to the FastAPI/PostGIS backend.
- **`bcryptjs` & `jsonwebtoken`**: Temporary password hashing and manual JWT token signing in `src/lib/auth.ts`. To be deprecated upon cutover to Firebase Authentication Admin SDK.
- **Unused Prisma**: Cleaned up from `prisma/` folder since database schema is managed directly via PostgreSQL/PostGIS migrations.
- **`leaflet` & `react-leaflet`**: Deprecate completely in favor of vector-based `maplibre-gl`.

---

## 3. Mobile Platform Dependency Strategy (React Native / Expo)

The mobile driver app is structured using **Expo SDK 51+** (Managed Workflow with prebuild support for background location tracking):

| Package | Recommended Version | Justification & Role |
| :--- | :--- | :--- |
| `expo` | `~51.0.0` | Robust cross-platform development framework with rapid OTA updates. |
| `react-native` | `0.74.x` | Modern mobile runtime with the New Architecture enabled. |
| `@react-navigation/native` | `^6.1.0` | Declarative native screen routing and tab navigation. |
| `@maplibre/maplibre-react-native` | `^10.0.0` | Native vector tile map renderer supporting offline tile package pre-caching. |
| `expo-location` | `~17.0.0` | Background GPS breadcrumb tracking with Kalman filtering and battery throttling. |
| `expo-sensors` | `~13.0.0` | Accelerometer & gyroscope access for automated crash and rollover detection. |
| `expo-notifications` | `~0.28.0` | Native FCM notification handler with critical alert break-through audio. |
| `@react-native-async-storage/async-storage`| `^1.23.0` | Key-value storage for driver credentials and local preferences. |
| `@nozbe/watermelondb` (or `expo-sqlite`) | Latest | High-performance local-first SQLite relational engine for offline trip caching and sync outbox. |
| `@react-native-community/netinfo` | `^11.3.0` | Network connectivity detection triggering automatic outbox synchronization. |
| `firebase` (Client SDK) | `^10.12.0` | Phone OTP authentication and token lifecycle management. |

---

## 4. Backend Dependency Strategy (FastAPI / Python 3.11+)

The backend environment requires high-performance computational, spatial, and asynchronous libraries:

```
# Core Framework & Server
fastapi>=0.111.0,<0.112.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0,<3.0.0
pydantic-settings>=2.2.0

# Database & Spatial Computing
sqlalchemy>=2.0.30
sqlmodel>=0.0.19
geoalchemy2>=0.15.0
asyncpg>=0.29.0
psycopg2-binary>=2.9.9
alembic>=1.13.0
pgvector>=0.2.5
shapely>=2.0.4

# In-Memory Cache & Message Streaming
redis>=5.0.4
hiredis>=2.3.2

# Operations Research & Constrained Optimization
ortools>=9.10.4067

# Agentic AI & LLM Orchestration
langgraph>=0.0.65
langchain>=0.2.0
langchain-community>=0.2.0
langchain-core>=0.2.0

# Asynchronous Background Tasks
celery>=5.4.0
# Alternative lightweight async task queue:
# arq>=0.26.0

# Authentication & Push Notifications
firebase-admin>=6.5.0

# Cloud Storage SDKs
azure-storage-blob>=12.20.0
boto3>=1.34.0

# Observability & Monitoring
opentelemetry-api>=1.25.0
opentelemetry-sdk>=1.25.0
opentelemetry-instrumentation-fastapi>=0.46b0
prometheus-fastapi-instrumentator>=7.0.0
sentry-sdk[fastapi]>=2.3.0

# Testing & Quality
pytest>=8.2.0
pytest-asyncio>=0.23.7
httpx>=0.27.0
ruff>=0.4.5
```

---

## 5. Security & Vulnerability Scanning Strategy

1. **Automated Dependency Audits**:
   - `npm audit --audit-level=high` executed in GitHub Actions for JavaScript/TypeScript packages.
   - `pip-audit` or `safety check` executed for Python backend virtual environments.
2. **Dependabot & Renovate Configuration**:
   - Weekly automated pull requests for minor and patch version bumps.
   - Immediate security patch alerts for CVEs affecting GIS or cryptography packages.
3. **Reproducible Builds**:
   - Enforce lockfile pinning (`package-lock.json` and `poetry.lock` / `requirements.txt.pinned`).
