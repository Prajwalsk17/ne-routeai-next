# AuraNER / NER-Route AI — Configuration Management & Environment Strategy

## 1. Environment Segregation Matrix

The platform strictly segregates configuration across three lifecycle environments to prevent test pollution, accidental data leaks, or unverified mock execution in production:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ENVIRONMENT SEGREGATION MATRIX                        │
├─────────────────────┬───────────────────┬───────────────────┬───────────────┤
│ Characteristic      │ Development (DEV) │ Staging (STAGING) │ Production    │
├─────────────────────┼───────────────────┼───────────────────┼───────────────┤
│ Target Environment  │ Local Dev Machine │ Pre-Prod Cluster  │ Indian Region │
│ File Template       │ `.env.development`│ `.env.staging.ex.`│ `.env.prod.ex`│
│ Database            │ Local / Dev DB    │ Staging Azure PG  │ Production HA │
│ Mock Providers      │ Allowed (`true`)  │ Forbidden(`false`)│ STRICTLY FALSE│
│ Telemetry Source    │ Synthetic Pings   │ Dogfood Fleet     │ Live Telematics│
│ SSL / TLS           │ HTTP / Localhost  │ Enforced HTTPS    │ Enforced HTTPS│
│ Logging Level       │ `debug`           │ `info`            │ `warn`/`error`│
│ Error Traces        │ Verbose in API    │ Sanitized in API  │ Strict Redact │
└─────────────────────┴───────────────────┴───────────────────┴───────────────┘
```

---

## 2. Complete Environment Variable Catalog

| Variable Name | Type / Enum | Default Value | Sensitivity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `APP_ENV` | `development` \| `staging` \| `production` | `development` | Public | Defines runtime execution constraints. |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info` | Public | Minimum logging priority threshold. |
| `NEXT_PUBLIC_APP_NAME` | `string` | `'AuraNER'` | Public | Branding displayed in page titles. |
| `NEXT_PUBLIC_APP_URL` | `string` (URL) | `http://localhost:3000` | Public | Public origin URL (HTTPS in prod). |
| `FASTAPI_BACKEND_URL` | `string` (URL) | `http://localhost:8000` | Private | Gateway URL to Python backend service. |
| `DATABASE_URL` | `string` (PG URL) | None | **SECRET** | PostgreSQL + PostGIS connection string. |
| `REDIS_URL` | `string` (Redis URL)| None | **SECRET** | Redis stream buffer & lock connection. |
| `SUPABASE_SERVICE_ROLE_KEY`| `string` | None | **SECRET** | Server-only Supabase bypass key. |
| `FIREBASE_PROJECT_ID` | `string` | None | Private | Firebase Authentication project. |
| `FIREBASE_CLIENT_EMAIL` | `string` (Email) | None | Private | Service account email for auth verify. |
| `FIREBASE_PRIVATE_KEY` | `string` | None | **SECRET** | Private key for Firebase Admin SDK. |
| `NEXT_PUBLIC_MAP_PROVIDER` | `maplibre` \| `mapbox` \| `google` | `maplibre` | Public | Client vector map rendering engine. |
| `NEXT_PUBLIC_MAP_STYLE_URL`| `string` (URL) | Liberty style | Public | Vector tile style stylesheet URL. |
| `ROUTING_PROVIDER` | `nextbillion` \| `osrm` \| `google` | `osrm` | Private | Road route topology engine. |
| `NEXTBILLION_API_KEY` | `string` | None | **SECRET** | Enterprise commercial routing key. |
| `GEOCODING_PROVIDER` | `mapbox` \| `nominatim` | `nominatim` | Private | Location search and reverse geocode. |
| `WEATHER_PROVIDER` | `tomorrow` \| `open-meteo` | `open-meteo` | Private | Meteorological radar observation API. |
| `TOMORROW_IO_API_KEY` | `string` | None | **SECRET** | Hyperlocal minute weather API key. |
| `TELEMETRY_PROVIDER` | `mqtt` \| `rest` \| `mock` | `mock` (dev) | Private | High-throughput GPS ingestion mode. |
| `MQTT_BROKER_URL` | `string` (URL) | None | Private | Enterprise MQTT telemetry broker. |
| `NOTIFICATION_PROVIDER` | `resend` \| `in_app` \| `log` | `log` (dev) | Private | Outbound alert transmission channel. |
| `RESEND_API_KEY` | `string` | None | **SECRET** | Transactional email notification key. |
| `STORAGE_PROVIDER` | `azure_blob` \| `s3` \| `local`| `local` (dev) | Private | Document and photo storage provider. |
| `STORAGE_BUCKET_NAME` | `string` | `'auraner-storage'`| Private | Container name for object storage. |
| `OPENTELEMETRY_EXPORTER_OTLP_ENDPOINT`| `string` (URL) | None | Private | OTLP metrics & trace collector URL. |
| `ALLOW_MOCK_PROVIDERS` | `boolean` | `true` (dev) | Public | Global mock provider safety master-switch. |

---

## 3. Strict Production Safety Invariants

The configuration validation engine in `src/lib/env.ts` enforces non-negotiable invariants via Zod `superRefine`:

1. **Mock Provider Prohibition**:
   ```typescript
   if (data.APP_ENV === 'production' && data.ALLOW_MOCK_PROVIDERS === true) {
     ctx.addIssue({
       code: z.ZodIssueCode.custom,
       path: ['ALLOW_MOCK_PROVIDERS'],
       message: 'ALLOW_MOCK_PROVIDERS must not be enabled in production environment.',
     });
   }
   ```
2. **HTTPS Protocol Enforcement**:
   - In production, `NEXT_PUBLIC_APP_URL` must strictly start with `https://`. Plaintext `http://` configurations are rejected at application boot.
3. **Secret Masking & Sanitization**:
   - Variables prefixed with `NEXT_PUBLIC_` are safely exposed to browser bundles.
   - Any secret key (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PRIVATE_KEY`, API tokens) must never have the `NEXT_PUBLIC_` prefix and is blocked from client-side imports.

---

## 4. Secret Management & Key Rotation

1. **Zero Committed Secrets**:
   - Real credentials are strictly excluded via `.gitignore` and `.dockerignore`.
   - Continuous scanning via GitHub secret scanning prevents accidental token commits.
2. **Runtime Secret Injection (Azure Key Vault)**:
   - In Staging and Production, containers obtain secrets dynamically at startup using **Azure Managed Service Identity (MSI)** without baking static credentials into configuration files.
3. **Key Rotation Schedule**:
   - Database passwords rotated every 180 days.
   - Enterprise API keys (NextBillion, Tomorrow.io, Resend) rotated every 90 days.
   - Storage encryption Customer Managed Keys (CMK) rotated annually.
