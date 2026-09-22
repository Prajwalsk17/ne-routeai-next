# AuraNER / NER-Route AI — Controlled Field Pilot Operational Guide (Phase 26)

## 1. Executive Summary & Purpose

The Controlled Field Pilot prepares **AuraNER / NER-Route AI** for controlled operational trials across selected state government departments, driver cohorts, logistics corridors, and mountain routes in Northeast India. 

The pilot operates under a **strictly bounded blast radius**:
- Participation is limited to enrolled **Pilot Cohorts**.
- Route movements are restricted to approved mountain corridors.
- Zero synthetic/fabricated operational results are permitted.
- Active incident escalation procedures and driver feedback channels ensure continuous operational safety.

---

## 2. Enrolled Pilot Cohorts & Corridors

Pilot activities are partitioned by state and department with defined vehicle and driver allocations:

| Cohort Identifier | Organization Name | State | Approved Corridors | Fleet / Driver Limits | Operational Objective |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cohort_assam_essential_food` | **Assam Food & Civil Supplies** (`org_pilot_assam_essential`) | Assam | `NH-27`, `NH-29`, `NH-37` | 3 Vehicles (`veh_pilot_as_*`), 2 Drivers (`drv_pilot_as_*`) | Essential grain and food supplies distribution between Guwahati depot and Nagaon/Dimapur |
| `cohort_meghalaya_pwd_roads` | **Meghalaya PWD Roads** (`org_pilot_meghalaya_pwd`) | Meghalaya | `NH-6`, `SH-19`, `NH-217` | 2 Vehicles (`veh_pilot_ml_*`), 1 Driver (`drv_pilot_ml_*`) | Mountain landslide inspection and bridge approach passability profiling |

```
                              [ CONTROLLED FIELD PILOT BOUNDARY ]
                                                │
             ┌──────────────────────────────────┴──────────────────────────────────┐
             ▼                                                                     ▼
     [ Assam Civil Supplies ]                                              [ Meghalaya PWD ]
   Guwahati Depot (Jalukbari)                                           Shillong Division HQ
             │                                                                     │
   Approved Corridors:                                                   Approved Corridors:
   - NH-27 (Guwahati ➔ Nagaon)                                           - NH-6 (Jorabat ➔ Shillong)
   - NH-29 (Dimapur ➔ Kohima)                                            - SH-19 (Shillong ➔ Dawki)
   - NH-37 (Guwahati ➔ Goalpara)                                         - NH-217 (Tura ➔ Dalu)
```

---

## 3. Operational Invariants & Boundary Guards

1. **Cohort Boundary Authorization (`isPilotAuthorized`)**:
   - Entities not enrolled in active cohorts are prohibited from launching pilot trips.
   - Movements on unapproved corridors trigger boundary alerts and are flagged for dispatcher review.
2. **Zero-Fabrication Rule**:
   - Unobserved road segments or areas without sensor readings report factual status as `UNKNOWN` or `UNOBSERVED`.
   - AI agents are prohibited from fabricating terrain gradients, weather conditions, or bypass routes.
3. **Human Approval Gates**:
   - Detours with $>100$km delta or routes with gradient $>14\%$ MUST halt at `HUMAN_APPROVAL_PENDING`.
   - Dispatchers must explicitly sign off before route commitment.

---

## 4. In-Field Usability Feedback Collection

Drivers and dispatchers submit feedback directly through the mobile app and dispatcher console (`POST /api/v1/pilot/feedback`):

### Feedback Categories:
- `GPS_ACCURACY`: Tunnel dead reckoning, canyon multipath jitter, mountain hairpin drift.
- `ROUTE_NAVIGATION`: Turn-by-turn guidance, steep grade warnings, bridge weight limits.
- `HAZARD_ALERT`: Landslide warnings, culvert washouts, flash flood alerts.
- `APP_USABILITY`: High-contrast in-cab UI, touch targets, glove ergonomics.
- `AI_ADVICE`: Detour explainability, safe-haven suggestions.
- `CONNECTIVITY` & `OFFLINE_SYNC`: Offline outbox caching during 2G/cellular blackout.

### Rating Scale:
- ⭐⭐⭐⭐⭐ (5) — Exceptional hill performance, zero issues.
- ⭐⭐⭐⭐ (4) — Minor lag or non-critical display delay.
- ⭐⭐⭐ (3) — Usable with workarounds; warrants optimization.
- ⭐⭐ (2) — Degraded usability; operational hindrance.
- ⭐ (1) — Critical operational failure; triggers immediate support triage.

---

## 5. Support Procedures & Incident Escalation Runbook

Field operational or software defects are captured via `POST /api/v1/pilot/incidents` and resolved according to severity-based SLAs:

```
[ Field Incident Logged ] ➔ [ L1 Dispatcher Triage ] ➔ [ L2 On-Call Technical ] ➔ [ L3 Engineering Lead ]
                                (Within SLA)             (Root Cause Analysis)       (Hotfix Deployment)
```

### Incident Severity & SLA Response Matrix:

| Severity | Definition | Resolution SLA | Escalation Target | Typical Trigger |
| :--- | :--- | :---: | :--- | :--- |
| **CRITICAL** | Total app crash, safety violation, vehicle immobilized on hill pass | **2 Hours** | Engineering Lead & District Disaster Officer | Highway washed out, cellular dead reckoning crash, false detour |
| **HIGH** | Telemetry outage $>5$ minutes, GPS jitter $>25$m, severe routing delay | **6 Hours** | Senior Backend & Mobile Engineer | GPS dropouts in deep river gorges, unhandled API 500 error |
| **MEDIUM** | UI display anomaly, minor offline sync conflict, slow query | **24 Hours** | Full-Stack Support Engineer | Outbox sync retry delay, chart rendering delay on mobile |
| **LOW** | Cosmetic UI defect, wording clarification, non-blocking suggestion | **72 Hours** | Product & QA Team | Minor text overflow, icon alignment on small screens |

---

## 6. Monitored Vectors & Operational Health

The pilot service tracks **9 critical monitoring vectors** continuously (`GET /api/v1/pilot/metrics`):

1. **Failures & Errors**: Uncaught exceptions, API 500 rate ($<0.5\%$), SQLite outbox sync conflicts.
2. **GPS Reliability**: Jitter average ($<15$m), dead reckoning count, packet drop rate ($<2.0\%$ healthy, $\le 5.0\%$ degraded).
3. **Routing Issues**: Off-route deviations ($>500$m), mountain gradient exceedances ($>14\%$), ETA drift.
4. **Notification Delivery**: FCM push delivery latency ($<500$ms), SMS fallback count, acknowledgement rate.
5. **AI Assistance**: Hallucination / ungrounded rejection count (must be 0), human approval turnaround, override rate.
6. **Operational Usability**: Driver CSAT rating ($\ge 4.0/5$), dispatcher triage velocity.
7. **Accessibility Issues**: Impassable corridor detections, PWD declaration updates.
8. **Security & Auditability**: Cross-tenant isolation violations (strictly 0), audit log completeness.
9. **Performance**: API p95 latency ($<150$ms), p99 latency ($<300$ms).
