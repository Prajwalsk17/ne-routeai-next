# AuraNER / NER-Route AI — Phase 21: Production Analytics Architecture

## 1. Executive Summary & Architectural Overview

The **Production Analytics Engine** of **AuraNER / NER-Route AI** delivers high-performance, multi-tenant, tamper-evident operational intelligence across the 8 northeastern states of India (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, and Sikkim).

In mountain and trans-border logistics, operational decisions depend directly on truthful, empirical metrics. Fabricated statistics, synthetic extrapolations, or hardcoded dashboard numbers can mislead disaster response authorities, civil supplies departments, and military relief coordinators. The Phase 21 Analytics Architecture implements strict architectural guardrails:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE OPERATIONAL INVARIANTS                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Zero-Fabrication Invariant:                                              │
│    All KPIs, trends, and scores are aggregated directly from genuine        │
│    operational domain entities (Trips, Shipments, Fleet, Drivers, Alerts). │
│ 2. Empty-State & Insufficient-Data Clarity:                                 │
│    If operational history is insufficient in the selected range, the system │
│    explicitly reports hasSufficientData: false with diagnostic reasons,    │
│    returning null rather than cosmetic synthetic placeholders.             │
│ 3. Strict Multi-Tenant Isolation:                                           │
│    Tenants can only aggregate and view their own organization's records.    │
│    Only SUPER_ADMIN users can request cross-tenant federated summaries.     │
│ 4. Cryptographic Provenance Chaining:                                       │
│    Every summary report generates a deterministic SHA-256 state hash        │
│    combining tenant ID, date bounds, trip counts, cargo, and timestamp.     │
│ 5. Standards-Compliant Export Pipeline:                                     │
│    Supports RFC 4180 CSV export and structured JSON download attachments    │
│    for external auditing, government reporting, and NDMA compliance.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Models & Metrics Taxonomy

The domain types are defined in [`src/lib/types/analytics.ts`](../src/lib/types/analytics.ts):

### 2.1 Core Performance Indicators (KPIs)
* **Total Trips** ($N_{\text{trips}}$): Total number of scheduled or active trips within the specified time range.
* **Completed Deliveries** ($N_{\text{completed}}$): Number of trips with terminal status `COMPLETED`.
* **On-Time Delivery Rate (%)**:
  $$\text{On-Time Rate} = \frac{\sum \text{Trips within } 15\text{ mins of planned arrival}}{\text{Completed Trips}} \times 100$$
* **Average Transit Delay (Minutes)**:
  $$\text{Avg Delay} = \frac{\sum \max(0, T_{\text{actual}} - T_{\text{scheduled}})}{\text{Completed Trips}}$$
* **Cargo Volume Moved (Kg)**: Aggregated gross weight of all consignments in `DELIVERED` or `IN_TRANSIT` states.
* **Fleet Utilization Rate (%)**: Proportion of non-archived fleet active or assigned vs total vehicles.
* **Active Situational Incidents**: Real-time count of unresolved road hazards, mudslides, or weather disruptions.

### 2.2 Corridor Reliability Metrics
Each transit corridor (e.g. *Guwahati–Kohima NH-29*, *Silchar–Aizawl NH-306*, *Shillong–Silchar NH-6*) computes an empirical reliability score:
$$\text{Reliability} = \min\left(100, \max\left(0, \text{Round}\left(0.8 \times \text{OnTimeRate} + 0.2 \times \left(1 - \frac{N_{\text{cancelled}}}{N_{\text{trips}}}\right) \times 100\right)\right)\right)$$

### 2.3 Bottleneck & Chokepoint Frequency
Identifies vulnerable mountain passes, ferry crossings, and landslide-prone sectors based on real incident alerts, computing disruption frequencies and historical closure durations.

### 2.4 Driver Safety & Mountain Compliance
Aggregates driver fleet metrics including average driver safety scores, hill terrain endorsements ($ \ge 3$ years mountain experience), active duty status, and incident attributions.

---

## 3. Zero-Fabrication Invariant & Empty States

When a tenant has zero trips and zero shipments within the selected time window (e.g. a newly onboarded district or an unutilized date range), the system does **not** generate synthetic mock figures.

```typescript
const hasSufficientData = totalTrips > 0 || filteredShipments.length > 0;
const insufficientDataReason = hasSufficientData
  ? undefined
  : 'Insufficient trip history for the selected date range';

if (!hasSufficientData) {
  onTimeDeliveryRatePct = null;
  avgTransitDelayMinutes = null;
}
```

The Web UI reflects this state via the universal `EmptyState` component:
* Displays an explicit banner: *"Insufficient Historical Data Available"*.
* Recommends actions: *"Dispatch a shipment consignment or record GPS vehicle telemetry to begin populating real analytics."*

---

## 4. Multi-Tenant Isolation & Role-Based Access Control

The Analytics subsystem enforces strict multi-tenant boundaries matching the enterprise RBAC matrix:

| Role | Tenant Scope | Cross-Tenant Aggregation | Export Permitted |
| :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | Global / Multi-Tenant | Yes (all Northeast states) | Yes (CSV & JSON) |
| `ORG_ADMIN` | Strict Single Tenant | No (403 if attempting cross-tenant) | Yes (CSV & JSON) |
| `LOGISTICS_MANAGER` | Strict Single Tenant | No | Yes (CSV & JSON) |
| `DISPATCHER` | Strict Single Tenant | No | Yes (CSV & JSON) |
| `DRIVER` | Assigned Vehicle/Trip only | No | No (Restricted) |
| `VIEWER` | Strict Single Tenant | No | Yes (Read-Only) |

---

## 5. Temporal Filtering & Trend Aggregations

The query service supports both preset and custom ISO 8601 temporal boundaries:
* **7D (Past 7 Days)**: Fine-grained daily bucketing for immediate operational debriefing.
* **30D (Past 30 Days)**: Default operational window for monthly logistics reporting.
* **90D (Past Quarter)**: Seasonal analysis (e.g., monsoon impact vs dry season transit times).
* **Custom Date Bounds**: Arbitrary user-specified start and end timestamps.

Supported aggregation intervals:
* `DAILY`: Day-by-day trend buckets.
* `WEEKLY`: 7-day rollups for quarterly reviews.
* `MONTHLY`: Calendar-month aggregates for government civil supply quotas.

---

## 6. Cryptographic Provenance

Every analytics payload includes a deterministic SHA-256 cryptographic provenance signature:

```typescript
export function computeAnalyticsProvenance(
  orgId: string | null,
  start: string,
  end: string,
  totalTrips: number,
  completedTrips: number,
  cargoMovedKg: number,
  asOf: string
): string {
  const payload = `${orgId || 'GLOBAL'}|${start}|${end}|${totalTrips}|${completedTrips}|${cargoMovedKg}|${asOf}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

This guarantees auditability, ensuring downstream systems and external regulatory bodies can verify that the reported figures were calculated directly from the operational database at the reported timestamp.

---

## 7. Standards-Compliant Export Pipeline (RFC 4180)

The endpoint `GET /api/v1/analytics/export?format=CSV` generates an RFC 4180 compliant CSV document:
* Proper quoting and comma escaping.
* Standardized sections: Metadata brief, Core KPIs, Corridor Reliability Metrics, and Transit Timeline Trends.
* Headers set to `Content-Disposition: attachment; filename="auraner-analytics-report-<timestamp>.csv"`.

For automated API consumers, `GET /api/v1/analytics/export?format=JSON` returns a complete machine-readable snapshot with the cryptographic provenance signature.

---

## 8. REST API Interface

### `GET /api/v1/analytics/summary`
* **Query Parameters**: `preset` (7D, 30D, 90D), `interval` (DAILY, WEEKLY, MONTHLY), `startDate`, `endDate`, `organizationId` (SUPER_ADMIN only).
* **Response**: Full `AnalyticsSummaryReport` object.

### `GET /api/v1/analytics/corridors`
* **Query Parameters**: `preset`, `startDate`, `endDate`.
* **Response**: List of `CorridorReliabilityMetric` items and critical bottlenecks.

### `GET /api/v1/analytics/export`
* **Query Parameters**: `preset`, `format` (`CSV` or `JSON`), `startDate`, `endDate`.
* **Response**: File download attachment with appropriate MIME type.

---

## 9. Verification & Quality Assurance

The analytics suite is verified by 10 comprehensive unit tests in [`src/lib/test/analytics.test.ts`](../src/lib/test/analytics.test.ts):
1. **Zero-Fabrication & Empty State Handling**: Asserts that empty trip history yields `hasSufficientData: false` and `null` rate metrics.
2. **Operational Calculations**: Verifies on-time delivery rates, delay minutes, cargo weights, fleet utilization, and driver compliance on genuine domain records.
3. **Multi-Tenancy & Query Isolation**: Proves Org A's operational records are completely invisible to Org B, while Super Admins can aggregate across tenants.
4. **Date Range Filtering**: Validates 7D, 30D, and 90D preset boundary arithmetic.
5. **CSV & JSON Export**: Asserts RFC 4180 formatting, headers, section structures, and JSON schemas.
6. **REST API & RBAC Protection**: Confirms 200 responses for authorized logistics roles, 401 for unauthenticated requests, and download content disposition headers.
