# AuraNER / NER-Route AI — Phase 13: Offline Synchronization & Conflict Engine Architecture

## 1. Executive Summary & Mountain Operational Context
In the rugged terrain of Northeast India (e.g. NH-29 Kohima–Dimapur bypass, NH-6 Meghalaya–Silchar hill corridor, and Tawang pass), vehicles regularly navigate steep gorges and deep river valleys where cellular connectivity drops out completely for hours.

Phase 13 establishes the production offline synchronization engine for the driver mobile application and logistics backend. In strict adherence to the project invariants:
- **Zero-Fabrication Invariant**: The system never manufactures fake synchronized data or synthesizes artificial delivery states when offline.
- **Conflict Handling Invariant**: The system never silently overwrites conflicting server state. If dispatch cancelled a consignment while a driver was disconnected, the server detects the conflict, rejects the invalid state transition, records a tamper-evident audit event, and returns actionable feedback to the mobile driver UI.
- **Partial Synchronization Guarantee**: Individual item failures or business conflicts do not roll back or abort other valid operations in the same synchronization batch.

---

## 2. System Architecture & Components

```
 ┌─────────────────────────────────────────────────────────┐
 │                   Driver Mobile Device                  │
 │                                                         │
 │  ┌─────────────────┐       ┌────────────────────────┐  │
 │  │ Field Triggers  │       │  In-Cab Local Outbox   │  │
 │  │ • POD           │ ───>  │  • Max 500 ops         │  │
 │  │ • Checkpoint    │       │  • Chronological queue │  │
 │  │ • GPS Telemetry │       │  • Retry Count & Backoff│ │
 │  │ • Hazard Report │       │  • Status (QUEUED/SYNC) │ │
 │  │ • SOS Trigger   │       └───────────┬────────────┘  │
 │  └─────────────────┘                   │               │
 │                                        ▼               │
 │                             ┌────────────────────┐     │
 │                             │ Connectivity Probe │     │
 │                             │ /api/health        │     │
 │                             └──────────┬─────────┘     │
 └────────────────────────────────────────┼───────────────┘
                                          │ Auto-flush on
                                          │ reconnection
                                          ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Next.js REST API (/api/v1/sync)           │
 │                                                         │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Tenant Scoping & Permission Guard                 │  │
 │  │ (Requires telemetry:write + Organization check)    │  │
 │  └──────────────────────────┬────────────────────────┘  │
 │                             │                           │
 │                             ▼                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Batch Processor (sync.service.ts)                 │  │
 │  │ 1. Chronological sorting by clientTimestamp       │  │
 │  │ 2. Isolated execution per item                    │  │
 │  │ 3. Explicit Conflict Resolution:                  │  │
 │  │    • CONFLICT_SHIPMENT_CANCELLED: REJECTED_INVALID│  │
 │  │    • ALREADY_DELIVERED: SERVER_WINS (Idempotent)  │  │
 │  │    • CONFLICT_TRIP_CANCELLED: REJECTED_INVALID    │  │
 │  │    • ALREADY_COMPLETED: SERVER_WINS               │  │
 │  │ 4. Audit Logging (SYNC_BATCH_PROCESSED)           │  │
 │  └──────────────────────────┬────────────────────────┘  │
 │                             │                           │
 │                             ▼                           │
 │  ┌───────────────────────────────────────────────────┐  │
 │  │ Domain Services (Shipment, Trip, Telemetry, Alert)│  │
 │  └───────────────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────┘
```

---

## 3. Conflict Resolution Strategy & Invariants

| Sync Operation Type | Conflict Condition | Resolution Strategy | System Behavior |
| :--- | :--- | :--- | :--- |
| `PROOF_OF_DELIVERY` | Shipment was marked `CANCELLED` on server by dispatch | `REJECTED_INVALID` | Rejects delivery transition; preserves server `CANCELLED` state; emits `SYNC_CONFLICT_DETECTED` audit record; alerts mobile driver to seek dispatch instruction. |
| `PROOF_OF_DELIVERY` | Shipment was already marked `DELIVERED` on server | `SERVER_WINS` | Idempotently updates missing digital signatures or photo URLs without duplicate status transitions or state corruption. |
| `CHECKPOINT_CLEARANCE` | Trip was cancelled on server | `REJECTED_INVALID` | Rejects stop clearance; preserves cancelled itinerary state. |
| `CHECKPOINT_CLEARANCE` | Checkpoint stop was already completed on server | `SERVER_WINS` | Returns synced confirmation idempotently. |
| `GPS_PING` | Vehicle location captured in shadow zone | `CLIENT_WINS` (Ingested) | Dispatches to telemetry service; preserves exact historical `clientTimestamp` and `is_offline_cached: true`. |
| `HAZARD_REPORT` | Roadside obstacle observed offline | `PROVENANCE_TAGGED` | Created with `[OFFLINE REPORT]` title and historical capture timestamp metadata. |
| `SOS_TRIGGER` | Driver triggered emergency SOS offline | `CRITICAL_BROADCAST` | High-priority emergency broadcast initiated immediately upon server ingestion regardless of business conflicts. |

---

## 4. Exponential Backoff & Retry Logic
When outbox operations encounter transport timeouts or unreachable gateways in mountain shadows:
$$\text{delayMs} = \min\left(3000 \times 2^{\text{retryCount}}, 30000\right)$$

- Attempt 0: 3,000 ms (3 seconds)
- Attempt 1: 6,000 ms (6 seconds)
- Attempt 2: 12,000 ms (12 seconds)
- Attempt 3: 24,000 ms (24 seconds)
- Attempt 4+: 30,000 ms (capped at 30 seconds)

After reaching `maxRetryAttempts` (5), the item is flagged as `FAILED` in the outbox. The driver can manually trigger a retry via the mobile UI or acknowledge and dismiss rejected items.

---

## 5. Session Expiration & Security Boundary
If a driver's JWT token expires during an extended multi-day mountain haul with intermittent coverage:
- The `/api/v1/sync` endpoint returns `401 Unauthorized`.
- The mobile sync engine intercepts the 401 response and transitions queued items to `AUTH_REQUIRED`.
- **Field Data Safety**: The local outbox does **NOT** drop or discard collected proof-of-delivery signatures or telemetry breadcrumbs.
- As soon as the driver re-authenticates (or biometric token is refreshed), the pending outbox automatically flushes to the server.

---

## 6. Verification & Test Suite
The implementation is validated by 27 automated tests in `src/lib/test/offline-sync.test.ts` alongside the complete 192-test regression suite:
1. Mobile outbox queueing, capacity enforcement, and listener subscriptions.
2. Connectivity probing, shadow-zone detection, and auto-sync upon reconnection.
3. Exponential backoff delay bounding ($3\text{s} \to 30\text{s}$) and retry exhaustion.
4. Explicit conflict resolution invariants (`CONFLICT_SHIPMENT_CANCELLED`, `ALREADY_DELIVERED`, `CONFLICT_TRIP_CANCELLED`).
5. Partial sync guarantee: independent processing where valid items succeed without rollback.
6. Chronological ordering preservation based on client timestamps.
7. High-priority offline SOS beacon and hazard report ingestion with offline provenance.
8. Session expiration safety (`AUTH_REQUIRED` preservation).
9. Multi-tenant isolation (rejection of cross-tenant sync requests).
10. REST API validation (HTTP 200/400/401/403 and batch limit of 200 operations).
11. Zero-fabrication invariant (preserving true offline timestamps).
