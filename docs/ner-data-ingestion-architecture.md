# Northeast Region (NER) Data Ingestion Architecture

## 1. Overview & Objective
Northeast India presents unique logistics challenges: mountainous terrain, seasonal monsoons, active landslide zones, border checkpoints, and volatile road passability across the Eight Sisters states:
- Arunachal Pradesh (AR)
- Assam (AS)
- Manipur (MN)
- Meghalaya (ML)
- Mizoram (MZ)
- Nagaland (NL)
- Sikkim (SK)
- Tripura (TR)

The **NER Data Ingestion Subsystem** ingests, validates, normalizes, deduplicates, and manages the lifecycle and provenance of external authoritative geospatial and operational intelligence feeds without fabricating any operational data.

---

## 2. Core Entities & Data Model

### 2.1 Data Sources (`data_sources`)
Authoritative registries representing external providers supplying real weather alerts, road conditions, river gauge telemetry, or accessibility changes.
- **Provider Types**: `IMD` (India Meteorological Department), `BRO` (Border Roads Organisation), `CWC` (Central Water Commission), `SDMA` (State Disaster Management Authority), `OPENSTREETMAP`, `POLICE_TRAFFIC_BRANCH`, `CUSTOM_NER_AGENCY`.
- **State Scopes**: Specific NER state codes or `ALL_NER`.
- **Reliability Rating**: Configurable confidence weight ($0.0 \dots 1.0$).
- **Health Metrics**: Total runs, failed runs, consecutive failures, and last run timestamps.

### 2.2 Ingestion Runs (`data_ingestion_runs`)
Auditable records of every batch fetch and ingestion execution.
- **Trigger Modes**: `SCHEDULED`, `MANUAL`, `WEBHOOK`.
- **Status Lifecycle**: `RUNNING` $\rightarrow$ `SUCCESS` | `PARTIAL` | `FAILED`.
- **Metrics**: `recordsFetched`, `recordsIngested`, `recordsSkippedDuplicate`, `recordsRejected`.
- **Payload Identity**: Deterministic SHA-256 hash of raw payloads for deduplication.
- **Error Log**: Granular per-record validation failure details preserving batch isolation.

### 2.3 Operational Intelligence Events
1. **Weather Events (`weather_events`)**:
   - Condition codes: `HEAVY_RAIN`, `MONSOON_FLOODING`, `LANDSLIDE_WARNING`, `DENSE_FOG`, `CYCLONE_WIND`, `HAILSTORM`, `NORMAL`.
   - Severity: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
   - Metrics: Precipitation rate (mm/h), wind speed (km/h), visibility (meters), temperature (°C).
   - Validity window: `validFrom` $\dots$ `validUntil`.
2. **Road Events (`road_events`)**:
   - Blockage types: `TOTAL_BLOCKAGE`, `PARTIAL_BLOCKAGE`, `ONE_WAY_RESTRICTION`, `WEIGHT_LIMITATION`, `HEIGHT_RESTRICTION`, `CLEAR`.
   - Disruption reasons: `LANDSLIDE`, `MUDSLIDE`, `BRIDGE_COLLAPSE`, `ROAD_WASHED_OUT`, `FLASH_FLOOD`, `SECURITY_CHECKPOINT`, `CIVIL_UNREST`, `CONSTRUCTION`, `SNOW_CLEARANCE`.
   - Structural metrics: Maximum gross weight allowed (tonnes), maximum vehicle height allowed (meters).
   - Affected corridor / highway identifier: e.g. NH-10 (Siliguri - Gangtok), NH-29 (Dimapur - Kohima).
3. **Accessibility Events (`accessibility_events`)**:
   - Accessibility tiers: `ALL_VEHICLES`, `LIGHT_VEHICLES_ONLY`, `FOUR_WHEEL_DRIVE_ONLY`, `CONVOY_ONLY`, `NO_ACCESS`.
   - Permit requirements: e.g. Inner Line Permit (ILP) or Protected Area Permit (PAP) mandatory checkpoints.
   - Night travel restrictions and seasonal weight limits.

---

## 3. Strict Geofencing & Validation

All ingested coordinates are validated against the Northeast India geographic bounding box:
$$\text{Latitude: } 21.5^\circ\text{N} \le \text{lat} \le 29.5^\circ\text{N}$$
$$\text{Longitude: } 88.0^\circ\text{E} \le \text{lng} \le 97.5^\circ\text{E}$$

Any external record reporting coordinates outside this geofence (such as New Delhi, Mumbai, or international oceans) is immediately rejected with a geofence error and logged to the run's `errorLog`, preventing corruption of NER operational intelligence.

---

## 4. Deduplication & Provenance Preservation

### 4.1 Deterministic Deduplication
Every incoming event is hashed using SHA-256 over its canonical identity tuple:
$$\text{Hash} = \text{SHA256}(\text{sourceId} + \text{externalRecordId} + \text{eventType} + \text{stateCode} + \text{coordinates} + \text{validity})$$

- If the hash already exists in `ingestedPayloadHashes`, the record is skipped, incrementing `recordsSkippedDuplicate`.
- Prevents database bloat from repeated scheduled polling runs.

### 4.2 End-to-End Provenance
Every accepted event maintains an immutable `provenance` record:
```typescript
interface EventProvenance {
  sourceId: string;
  sourceCode: string;
  sourceProvider: DataSourceProviderType;
  ingestionRunId: string;
  externalRecordId: string;
  ingestedAt: string; // ISO-8601
  payloadHash: string;
  reliabilityRating: number;
}
```

---

## 5. Dynamic Freshness Lifecycle

Events transition across three dynamic freshness states evaluated at query time:
- **`FRESH`**: Current time is within the event's valid window ($\text{validFrom} \le \text{now} \le \text{validUntil}$).
- **`STALE`**: Event validity expired within the last 24 hours ($\text{validUntil} \le \text{now} \le \text{validUntil} + 24\text{h}$). Signals that data may still have lingering effects but warrants re-verification.
- **`EXPIRED`**: Expired more than 24 hours ago. Automatically excluded from active routing consideration unless explicitly requested with historical flags.

---

## 6. Fault Isolation & Retry Behavior

1. **Partial Batch Safety**:
   If an external feed contains 10 records where 8 are valid and 2 are malformed or out-of-bounds:
   - 8 records are committed.
   - 2 records are logged to `errorLog`.
   - The run completes with status `PARTIAL`, ensuring valid data is never discarded due to isolated upstream errors.
2. **Exponential Backoff Network Retries**:
   The feed fetcher executes up to 3 retry attempts with exponential backoff on transient network faults (`ETIMEDOUT`, `ECONNRESET`, HTTP 5xx).
3. **Health & Circuit Breaker Tracking**:
   Consecutive failures increment `consecutiveFailures`. If consecutive failures exceed 5, the data source is flagged for administrative attention.

---

## 7. Security, RBAC & Auditability

- **Permissions**:
  - `data:read`: Required for querying data sources, ingestion run histories, and active/stale events. Granted to `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `DRIVER`, `VIEWER`.
  - `data:ingest`: Required for registering data sources, updating configurations, and manually triggering ingestion runs. Restricted to `SUPER_ADMIN`, `ORG_ADMIN`, `DISPATCHER`.
- **Audit Logging**:
  All ingestion executions emit immutable audit events:
  - `DATA_INGESTION_STARTED`
  - `DATA_INGESTION_COMPLETED`
  - `DATA_INGESTION_FAILED`
