# AuraNER / NER-Route AI — Continuous Monitoring & Improvement Guide (Phase 28)

## 1. Purpose & Continuous Operational Excellence

This operational guide establishes the long-term **Continuous Monitoring, Incident Response, Root-Cause Analysis (RCA), and Operational Improvement Processes** for **AuraNER / NER-Route AI**.

It operationalizes the platform's core architectural tenets:
1. **Zero-Fabrication Standard**: Dashboards and operational monitors report authentic, verified metrics. Unobserved vectors are explicitly marked as `UNOBSERVED` rather than synthesized.
2. **AI Operational Governance**:
   > *AI reasons. APIs provide facts. Algorithms calculate. Backend enforces. Humans approve critical decisions.*

---

## 2. 18-Vector Continuous Monitoring Matrix

Continuous monitoring tracks the health of all platform sub-systems against quantifiable Service Level Objectives (SLOs):

| # | Vector | Monitored Metric | Target SLO | Warning (HIGH) | Incident (CRITICAL) |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | **Uptime** | HTTP availability & probe success | **99.9%** | $< 99.9\%$ for 5 min | $< 99.0\%$ or endpoint down |
| **2** | **API Health** | HTTP 5xx error rate & P95 latency | **99.5%** | Error rate $> 1.0\%$ | Error rate $> 5.0\%$ |
| **3** | **Database Health** | Connection pool & WAL archive lag | **99.9%** | WAL lag $> 60\text{s}$ | Pool exhausted or DB unreachable |
| **4** | **GPS Ingestion** | Packet drop rate & clock drift | **95.0%** | Packet drop $> 5.0\%$ | Ingestion queue stall ($> 15\%$) |
| **5** | **Routing Providers** | OSRM latency & fallback rate | **99.0%** | Fallback rate $> 10\%$ | Primary & fallback unavailable |
| **6** | **Weather Providers** | IMD/Open-Meteo freshness & cache hit | **95.0%** | Stale data $> 30\text{m}$ | Radar feed outage ($> 2\text{h}$) |
| **7** | **NER Data Ingestion** | BRO closures / CWC water gauge parse | **95.0%** | Parse error $> 5\%$ | Source feed parsing crash |
| **8** | **Risk Engine** | Risk compute latency & surge alerts | **99.0%** | Latency $> 200\text{ms}$ | Risk calculation exception |
| **9** | **Accessibility Engine**| Corridor bottleneck detection & 4WD | **95.0%** | Stale declarations $> 10$ | Accessibility check failure |
| **10**| **Logistics Optimization**| CVRP solver run duration & feasibility| **95.0%** | Solver duration $> 10\text{s}$ | Solver crash / unhandled infeasible |
| **11**| **AI Multi-Agent Systems**| Tool authorization & token burn rate | **99.0%** | Token burn $> 120\%$ budget | **Any unauthorized tool attempt** |
| **12**| **Dynamic Replanning** | Off-route deviation & turnaround time | **95.0%** | Dispatcher approval $> 30\text{m}$| Non-silent route mutation |
| **13**| **Notifications** | FCM Push / In-App delivery latency | **99.0%** | Delivery drop $< 95\%$ | Push gateway authentication failure |
| **14**| **Operational Analytics**| Aggregation query latency & cache hit | **99.0%** | Latency $> 2.0\text{s}$ | Report computation failure |
| **15**| **Platform Security** | Failed auth bursts & audit chain state | **100.0%** | Failed auth $> 50/\text{min}$ | **Audit log SHA-256 chain broken** |
| **16**| **Runtime Performance**| Node.js Heap / Event loop lag | **95.0%** | Heap $> 1.5\text{GB}$ / Lag $> 100\text{ms}$| Process Out-Of-Memory warning |
| **17**| **Cloud Spend & Cost** | Daily infrastructure spend vs budget | **95.0%** | Daily spend $> 120\%$ budget | Runaway cloud infrastructure spin-up |
| **18**| **User/Driver Issues** | In-cab reported problems & CSAT | **90.0%** | Open driver issues $> 15$ | Critical safety SOS report unresolved |

---

## 3. Incident Detection & 5-Whys Root-Cause Analysis (RCA) Runbook

When an operational anomaly or threshold violation is detected:

```
[ Automated Alert Triggered ]
           │
           ▼
[ L1 Triage (On-Call Engineer) ] ── (Within 15 mins)
           │
           ├─ If Critical: Engage Incident Commander & Dispatch Team
           │
           ▼
[ Mitigation & Recovery ] ── (Apply runbook / Blue-Green rollback)
           │
           ▼
[ Post-Mortem & 5-Whys Root-Cause Analysis (RCA) ] ── (Within 48 hours)
           │
           ▼
[ Improvement Backlog Insertion ] ── (P0 / P1 ticket added to backlog)
```

### 5-Whys RCA Template:
1. **Incident Title & ID**: Unique tracking identifier (`rca_<timestamp>`).
2. **Impacted Vector**: Operational domain affected.
3. **Five Whys Traversal**: Sequential root-cause drill-down uncovering system, procedural, or infrastructural defects.
4. **Corrective Actions**: Immediate fixes applied to restore operational health.
5. **Preventative Measures**: Long-term structural hardening preventing recurrence.

---

## 4. Maintenance & Bug Fixing Lifecycle

1. **Regular Patching Schedule**:
   - Bi-weekly minor maintenance sprint (non-breaking bug fixes, UI touch optimizations).
   - Monthly upstream dependency review and security patching.
2. **Emergency Hotfix Procedure**:
   - Branch from `main` (`hotfix/<issue>`).
   - Run full Vitest regression suite and typecheck locally.
   - Deploy directly through GitHub Actions with Release Gate sign-off.
3. **Dependency Updates**:
   - Automated weekly vulnerability scanning via GitHub Dependabot.
   - Zero critical or high CVE tolerance in production container base images (`node:20-alpine`, `python:3.11-slim`).

---

## 5. Continuous AI Evaluation Lifecycle

To prevent prompt drift, hallucinations, and ungrounded recommendations:
1. **8-Dimension Continuous Evaluation**:
   - Factual Grounding & Anti-Fabrication
   - Tool Usage & Schema Conformance
   - Least-Privilege Tool Authorization
   - Hallucination Resistance & Adversarial Robustness
   - Cryptographic State Provenance
   - Physical Terrain & Vehicle Chassis Bounds
   - Mandatory Human Dispatcher Approval
   - Token & Financial Cost Efficiency
2. **Evaluation Harness**: Executed automatically on every pull request and on weekly production cron schedules (`evaluateAgentRunSuite()`).

---

## 6. Data Quality Monitoring Lifecycle

Data from remote agencies (BRO, IMD, CWC) undergoes strict automated quality filtering:
- **Spatial Bounds Check**: All coordinates must reside within the Northeast India administrative bounding box ($89.5^\circ\text{E} - 97.5^\circ\text{E},\ 21.5^\circ\text{N} - 29.5^\circ\text{N}$).
- **Event Deduplication**: SHA-256 fingerprint matching across source bulletin text prevents duplicate road hazards.
- **Freshness Decay**: Hazard bulletins older than 48 hours without confirmation transition to `STALE` and trigger field re-inspection alerts.

---

## 7. Capacity Planning & Disaster Recovery Drills

- **PostgreSQL Database**:
  - Weekly VACUUM ANALYZE and BRIN spatial index re-indexing.
  - Storage auto-grow configured up to 2TB with 80% capacity alert threshold.
- **Redis Streams & Cache**:
  - `allkeys-lru` memory eviction policy with 1.5GB soft cap.
- **Weekly Disaster Recovery Drill**:
  - Point-in-time recovery (PITR) test execution verifying RTO $< 15\text{ minutes}$ and RPO $< 1\text{ minute}$.

---

## 8. Continuous UX & Driver In-Cab Usability Improvement

- Driver mobile app usability reviewed continuously from in-cab feedback:
  - Minimum 56px touch targets for gloved and wet-weather driving.
  - High-contrast road hazard symbology.
  - Hands-free voice note transcription for mountain convoy drivers.
