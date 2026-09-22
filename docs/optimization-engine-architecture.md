# Phase 17: Constrained Logistics Optimization Engine Architecture Specification

**Document Version:** 2.0.0-PROD  
**Status:** IMPLEMENTED & PRODUCTION-VERIFIED  
**Component:** Logistics Optimization Engine (`src/lib/services/optimization.service.ts`, `src/lib/types/optimization.ts`, `src/app/api/v1/optimization/*`)  
**Target Coverage:** Northeast India (Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Sikkim)

---

## 1. Executive Summary & Core Invariants

The **AuraNER / NER-Route AI Logistics Optimization Engine** solves constrained combinatorial dispatch, fleet assignment, and route sequencing across Northeast India's complex mountain corridors and seasonal monsoons.

### Fundamental Operating Invariants

1. **Operates Strictly on Real Input Data**:
   - The optimization solver ingests active candidate shipments, verified vehicle specifications, certified driver qualifications, and real road corridor topologies.
2. **Zero Fabrication Invariant**:
   - Optimization results are never fabricated or simulated.
   - If constraints cannot be satisfied mathematically (e.g., aggregate cargo exceeds available fleet capacity, or no refrigerated vehicle is available for vaccine consignments), the engine strictly returns `status: 'INFEASIBLE'` with explicit constraint violation diagnostics.
3. **Mandatory Human Approval for Critical Decisions**:
   - Optimization computations generate candidate allocation plans with status `PENDING_APPROVAL`.
   - The engine **prohibits** automatic mutation of operational database records (shipments, trips, vehicle locks). An authorized Dispatcher or Logistics Manager must review and explicitly execute the approval (`POST /api/v1/optimization/runs/[id]/approve`) and application (`POST /api/v1/optimization/runs/[id]/apply`) workflows.
4. **Multi-Dimensional Constraint Enforcement**:
   - Multi-dimensional vehicle constraints (payload kg, cargo volume m³, road gradient tolerance %, bridge/dock limits, cold-chain refrigeration).
   - Driver safety constraints (active duty status, mountain endorsements, $\ge 3$ years mountain experience for steep hill sectors, maximum daily driving limits).
   - Route and corridor constraints (avoidance of isolated/severed corridors, time window propagation).
5. **Multi-Objective Cost Formulation**:
   - Prioritizes critical emergency relief and medical supplies over general cargo.
   - Solves multi-stop Capacitated Vehicle Routing Problem (CVRP) and Vehicle Routing Problem with Time Windows (VRPTW) with return-to-depot inspection guarantees.

---

## 2. Domain Data Model & Types

The data model is formalized in [`src/lib/types/optimization.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/types/optimization.ts) and validated using Zod in [`src/lib/validation/index.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/validation/index.ts).

### Core Enums
- **`SolverAlgorithm`**: `'OR_TOOLS_VRPTW' | 'OR_TOOLS_CVRP' | 'HEURISTIC_TERRAIN'`
- **`OptimizationStatus`**: `'RUNNING' | 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'FAILED'`
- **`ApprovalStatus`**: `'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'APPLIED'`
- **`OptimizationObjective`**: `'MINIMIZE_TRANSIT_DURATION' | 'MINIMIZE_TOTAL_DISTANCE' | 'MINIMIZE_RISK_EXPOSURE' | 'MAXIMIZE_PRIORITY_FULFILLMENT' | 'BALANCED'`

### Core Entity: `OptimizationRun`
```typescript
export interface OptimizationRun {
  id: string;
  organizationId: string;
  solverAlgorithm: SolverAlgorithm;
  status: OptimizationStatus;
  approvalStatus: ApprovalStatus;
  inputRequestCount: number;
  allocatedVehicleCount: number;
  unassignedRequestCount: number;
  computationTimeMs: number;
  solutionMetrics: OptimizationSolutionMetrics;
  routes: PlannedVehicleRoute[];
  unassignedRequests: UnassignedShipmentDetail[];
  violations: OptimizationConstraintViolation[];
  explainability: OptimizationExplainability;
  provenance: {
    engineVersion: string;
    computedAt: string;
    solverHash: string;
    approvedBy?: string | null;
    approvedAt?: string | null;
    appliedAt?: string | null;
    rejectionReason?: string | null;
  };
}
```

---

## 3. Mathematical Constraints & Ingress Invariants

### 3.1 Vehicle Constraints
1. **Payload Capacity Bound**:
   $$\sum_{i \in \text{Route}_k} \text{weight}_i \le \text{CapacityKg}_k$$
2. **Volume Capacity Bound**:
   $$\sum_{i \in \text{Route}_k} \text{volume}_i \le \text{VolumeM3}_k$$
3. **Cold-Chain Refrigeration Bound**:
   $$\forall i \in \text{Route}_k, \quad \text{requiresColdChain}_i \implies \text{hasColdChain}_k = \text{true}$$
4. **Terrain Gradient Bound**:
   $$\forall (u, v) \in \text{Route}_k, \quad \text{gradient}(u, v) \le \text{maxGradientPct}_k$$
   Sectors exceeding $12\%$ slope require 4x4 low-range transmission or high-gradient chassis.

### 3.2 Driver Safety Constraints
1. **Duty Status**: Drivers must be currently `AVAILABLE`. Off-duty or suspended operators are excluded.
2. **Mountain Experience Qualification**:
   $$\forall (u, v) \in \text{Route}_k, \quad \text{gradient}(u, v) > 12\% \implies \text{DriverExperienceYears} \ge 3 \land \text{hasMountainEndorsement} = \text{true}$$
3. **Maximum Daily Driving Limits**: Daily driving duration capped at 10 hours.

### 3.3 Time-Window Propagation (VRPTW)
For each stop $j$ visited immediately after stop $i$:
$$t_{\text{arrival}, j} = t_{\text{departure}, i} + \text{duration}(i, j)$$
$$t_{\text{start\_service}, j} = \max(t_{\text{arrival}, j}, \text{earliestPickup}_j)$$
$$t_{\text{departure}, j} = t_{\text{start\_service}, j} + \text{serviceDuration}_j$$
If $t_{\text{arrival}, j} > \text{latestDelivery}_j$, an actionable `TIME_WINDOW_VIOLATED` diagnostic is recorded.

---

## 4. Multi-Objective Cost Function

The engine computes a balanced multi-objective score:
$$\text{Cost} = w_{\text{dur}} \cdot \frac{\text{DurationMinutes}}{60} + w_{\text{dist}} \cdot \frac{\text{DistanceKm}}{100} + w_{\text{risk}} \cdot \text{AverageRisk} \cdot 100 + w_{\text{cost}} \cdot N_{\text{vehicles}} \cdot 15$$
Default weights:
- $w_{\text{dur}} = 0.35$ (Minimize transit duration)
- $w_{\text{dist}} = 0.25$ (Minimize total distance)
- $w_{\text{risk}} = 0.25$ (Minimize corridor risk exposure)
- $w_{\text{cost}} = 0.15$ (Minimize fleet vehicle count)

---

## 5. Human Approval & Application Lifecycle

To prevent unintended or unverified changes to active operations, all optimization runs pass through an explicit human gate:

```
[ POST /api/v1/optimization/run ]
                │
                ▼
      ┌──────────────────┐
      │ PENDING_APPROVAL │ ◄── Infeasible or candidate plan generated
      └────────┬─────────┘
               │
        Dispatcher Review
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│   APPROVED   │ │   REJECTED   │
└──────┬───────┘ └──────────────┘
       │
[ POST /api/v1/optimization/runs/[id]/apply ]
       │
       ▼
┌──────────────┐
│   APPLIED    │ ◄── Creates active trips, binds driver/vehicle, sets shipments ASSIGNED
└──────────────┘
```

1. **Creation**: Status set to `PENDING_APPROVAL`.
2. **Approval** (`POST /api/v1/optimization/runs/[id]/approve`): Requires `shipments:dispatch` or `routes:override`. Sets `approvedBy` and `approvedAt`.
3. **Application** (`POST /api/v1/optimization/runs/[id]/apply`):
   - Invariant: Fails if status is not `APPROVED`.
   - Creates active `Trip` records via `trip.service.ts`.
   - Assigns stops (`TripStop`) and binds shipments (`status = 'ASSIGNED'`).
   - Locks vehicles to `status = 'ASSIGNED'`.
   - Emits tamper-evident SHA-256 audit logs.
4. **Rejection** (`POST /api/v1/optimization/runs/[id]/reject`): Records reason; leaves operational database records untouched.

---

## 6. REST API Endpoints & RBAC Matrix

| Endpoint | Method | Required Permission | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `/api/v1/optimization/run` | `POST` | `routes:calculate` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER` (denies `VIEWER`, `DRIVER`) |
| `/api/v1/optimization/runs` | `GET` | `data:read` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER` |
| `/api/v1/optimization/runs/[id]` | `GET` | `data:read` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER`, `VIEWER` |
| `/api/v1/optimization/runs/[id]/approve` | `POST` | `shipments:dispatch` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER` |
| `/api/v1/optimization/runs/[id]/apply` | `POST` | `shipments:dispatch` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER` |
| `/api/v1/optimization/runs/[id]/reject` | `POST` | `shipments:dispatch` | `ADMIN`, `DISPATCHER`, `LOGISTICS_MANAGER` |

---

## 7. Verification & Quality Assurance

The Optimization Engine was verified against a 12-test suite ([`src/lib/test/optimization-engine.test.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/test/optimization-engine.test.ts)):

1. **Feasible CVRP / VRPTW Multi-Stop Dispatch**: Sequences stops from central depot to destinations and returns to depot.
2. **Priority-Driven Allocation**: Prioritizes `CRITICAL` disaster relief shipments over `LOW` priority freight when capacity is constrained.
3. **Cold-Chain Refrigeration Compliance**: Routes refrigerated medical vaccines strictly to cold-chain equipped vehicles.
4. **Mountain Terrain & Gradient Constraints**: Enforces 4x4 high-grade vehicle and experienced mountain driver for steep sectors ($> 25\%$).
5. **Time Window Propagation**: Calculates cumulative durations and detects expired deadlines.
6. **Infeasibility Diagnostics**: Returns `INFEASIBLE` with explicit violation diagnostics when zero operational fleet is available or demand exceeds capacity.
7. **Human Approval Lifecycle**: Verifies `PENDING_APPROVAL` prevents unapproved application; confirms `APPROVED` allows atomic operational state application; validates rejection workflow.
8. **REST API & RBAC Authorization**: Validates permissions and asserts `VIEWER` receives `403 Forbidden`.

### Test & Build Summary
- **Optimization Unit & Integration Tests**: 12/12 passed (`src/lib/test/optimization-engine.test.ts`).
- **Regression Test Suite**: 17/17 test files passed, 261/261 tests passed (0 failures).
- **TypeScript Typecheck**: Strict 0 errors (`npm run typecheck` & `npx tsc -p mobile/tsconfig.json --noEmit`).
- **Next.js Production Build**: Clean static and dynamic compilation (`npm run build`).
