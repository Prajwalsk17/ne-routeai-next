# Phase 23: Production Observability Architecture

## 1. Executive Summary & Observability Architecture

The **NER-Route AI** platform provides mission-critical disaster management and route optimization across the North Eastern Region of India. System operations require high-fidelity telemetry, distributed tracing, operational metrics, and robust health diagnostics without compromising data privacy, operational security, or incurring cloud vendor lock-in.

Phase 23 establishes an OpenTelemetry-compliant observability foundation across the entire application stack:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          NER-ROUTE AI OBSERVABILITY PLATFORM                           │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Pillar                         │ Specification & Implementation Details                │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 1. Distributed Tracing         │ OpenTelemetry-compatible Span & Tracer with W3C       │
│                                │ TraceContext (`traceparent`) distributed propagation. │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. Operational Metrics         │ Multi-dimensional Counters, UpDownCounters, Gauges,   │
│                                │ Histograms (p50/p90/p95/p99) & Prometheus exporter.   │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. Request Correlation         │ Unified `X-Correlation-ID`, `X-Request-ID`, and W3C   │
│                                │ propagation across Next.js Edge Middleware and APIs.  │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. Subsystem Telemetry         │ Specialized tracing & metrics for AI Agents, VRPTW    │
│                                │ Solvers, GPS Telemetry Ingest, & External Data Feeds. │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 5. Multi-Tier Health Probes    │ Liveness, deep Readiness (with live SQLite ping and   │
│                                │ readiness score calculation), and Metrics probes.     │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 6. Zero-Leakage Privacy Engine │ Automated redaction of tokens, passwords, secrets,    │
│                                │ credentials, and sensitive operational parameters.    │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 2. Distributed Tracing & W3C TraceContext

Implemented in [`src/lib/observability/tracer.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/observability/tracer.ts).

### 2.1 W3C TraceContext Standard
Distributed tracing conforms to the W3C TraceContext Level 1 specification:
- Header: `traceparent: {version}-{trace_id}-{parent_id}-{trace_flags}`
- Format: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`
- Root spans automatically generate 128-bit hex `traceId` and 64-bit hex `spanId`.
- Child spans inherit their parent's `traceId` while generating unique child `spanId`s and recording `parentSpanId`.

### 2.2 In-Memory Diagnostic Ring Buffer
Spans record start and end timestamps, status codes (`UNSET`, `OK`, `ERROR`), event logs, and metadata attributes. When ended, spans are appended to a high-throughput, bounded ring buffer (500 spans max) preventing memory growth while providing immediate diagnostic inspection.

### 2.3 Redaction on Attribute Ingestion
Attributes passed to any span are checked against sensitive keys (`password`, `token`, `secret`, `authorization`, `cookie`, `key`, `otp`, `aadhaar`, `phone`). Any matching key's value is transformed into `"[REDACTED]"` prior to storage.

---

## 3. Operational Metrics Registry & Prometheus Exporter

Implemented in [`src/lib/observability/metrics.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/observability/metrics.ts).

### 3.1 Supported Metric Instruments
1. **Counter**: Monotonically increasing 64-bit float counter for cumulative events.
2. **UpDownCounter**: Bidirectional gauge-like counter for concurrency, queue depth, or active state tracking.
3. **Histogram**: Exponentially or linearly bucketed latency distribution tracker calculating real-time percentiles:
   - $p_{50}$ (Median)
   - $p_{90}$ (90th percentile)
   - $p_{95}$ (95th percentile SLA)
   - $p_{99}$ (Tail latency)
4. **Gauge**: Direct numerical value representing instantaneous system state.

### 3.2 Standard Pre-Registered Operational Metrics

| Metric Name | Type | Description & Primary Dimensions |
| :--- | :--- | :--- |
| `http_requests_total` | Counter | Total HTTP requests handled (`method`, `status`, `route`) |
| `http_request_duration_ms` | Histogram | End-to-end HTTP request latency distribution |
| `route_calculation_duration_ms` | Histogram | Latency of routing and multi-stop calculations |
| `gps_pings_ingested_total` | Counter | Total vehicle GPS coordinate telemetry records ingested |
| `active_fleet_vehicles` | Gauge | Instantaneous number of vehicles reporting telemetry |
| `ai_agent_executions_total` | Counter | AI reasoning agent invocations (`agent`, `status`) |
| `ai_agent_token_consumption_total` | Counter | LLM token usage across agents (`agent`, `model`, `type`) |
| `optimization_runs_total` | Counter | Vehicle Routing Problem (VRPTW) optimization runs |
| `optimization_duration_ms` | Histogram | Execution duration of solver optimization passes |
| `ingestion_job_runs_total` | Counter | External data ingestion runs (`source`, `status`) |
| `active_alerts_total` | Gauge | Real-time active alerts count (`severity`) |

### 3.3 Prometheus Text Format Output
Scrapeable at `/api/v1/observability/metrics` and `/api/health?probe=metrics`:
```prometheus
# HELP http_requests_total Total HTTP requests handled by the service
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/health",status="200"} 42

# HELP http_request_duration_ms HTTP request execution duration in milliseconds
# TYPE http_request_duration_ms summary
http_request_duration_ms{quantile="0.5"} 12.4
http_request_duration_ms{quantile="0.9"} 28.1
http_request_duration_ms{quantile="0.95"} 35.8
http_request_duration_ms{quantile="0.99"} 52.0
http_request_duration_ms_sum 1420.5
http_request_duration_ms_count 58
```

---

## 4. Subsystem Telemetry Wrappers

Implemented in [`src/lib/observability/subsystem-telemetry.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/lib/observability/subsystem-telemetry.ts).

Specialized helper wrappers instrument high-value asynchronous operations:

### 4.1 AI Agent Observability (`observeAiExecution`)
- Creates span `ai.agent.{agentName}` with root or correlated context.
- Records `ai.agent.run_id`, `ai.agent.status`, `ai.agent.tokens`.
- Increments `ai_agent_executions_total` and `ai_agent_token_consumption_total`.
- Captures unhandled exceptions, updates span status to `ERROR`, logs structured alert, and safely re-throws.

### 4.2 Optimization & Solver Observability (`observeOptimization`)
- Creates span `optimization.{solverType}` with vehicle and shipment dimensions.
- Records duration in `optimization_duration_ms` histogram.
- Increments `optimization_runs_total{solver, status}`.

### 4.3 GPS Ingestion Observability (`observeGpsIngest`)
- Creates span `gps.telemetry.ingest` tracking batch size and ingestion latency.
- Increments `gps_pings_ingested_total` counter.
- Updates `active_fleet_vehicles` gauge.

### 4.4 External Feeds Ingestion Observability (`observeExternalIngestion`)
- Creates span `ingestion.feed.{source}` (e.g., `IMD_RADAR`, `BRO_ROAD_STATUS`, `CWC_FLOOD`).
- Increments `ingestion_job_runs_total{source, status}`.

---

## 5. Multi-Tier Health Check System

Implemented in [`src/app/api/health/route.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/app/api/health/route.ts).

### 5.1 Liveness Probe (`GET /api/health?probe=liveness`)
- Returns process heartbeat, uptime, version, and timestamp within $< 5\text{ms}$.
- Used by container orchestrators to detect process lockup.

### 5.2 Deep Readiness Probe (`GET /api/health?probe=readiness`)
- Performs real empirical latency testing on primary SQLite database via `SELECT 1 as alive`.
- Verifies Supabase reachability configuration.
- Checks heap memory usage against safety thresholds.
- Calculates an objective `readiness_score_pct` ($0\dots 100\%$).
- If any critical subsystem is unavailable, returns `HTTP 503` with detailed check breakdowns.

### 5.3 Metrics Probe (`GET /api/health?probe=metrics`)
- Generates OpenMetrics / Prometheus standard text format directly.

---

## 6. Edge Middleware Correlation & Distributed Propagation

Implemented in [`src/middleware.ts`](file:///c:/Users/Asus/Documents/vscodefolder/ne-routeai-next/src/middleware.ts).

- Every inbound HTTP request is checked for existing `traceparent`, `X-Correlation-ID`, and `X-Request-ID`.
- If missing, a compliant W3C `traceparent` and UUID `correlationId` are minted at the edge.
- Both request headers (forwarded to downstream route handlers) and response headers (returned to client callers) are tagged with correlation identifiers.
- Latency and status codes are registered into the global metrics registry upon completion.

---

## 7. Operational Alerting Foundations

| Alert Name | Metric Trigger | Evaluation Window | Severity | Escalation Channel |
| :--- | :--- | :--- | :--- | :--- |
| `HighHttp5xxRate` | Error rate $> 2.0\%$ | 3 minutes | `CRITICAL` | PagerDuty / On-call Ops |
| `DegradedReadiness` | Readiness score $< 75\%$ | Instantaneous | `HIGH` | SRE Dashboard Alert |
| `SolverLatencySpike` | Optimization p95 $> 5,000\text{ms}$ | 5 minutes | `HIGH` | Logistics Operations |
| `GpsTelemetryStarvation`| GPS ping rate drops $> 80\%$ | 10 minutes | `HIGH` | Fleet Telemetry Ops |
| `AiTokenConsumptionSpike`| Token consumption $> 500,000$ / hr | 1 hour | `MEDIUM` | Billing / AI Ops |
| `HighMemoryAllocation` | Node heap usage $> 85\%$ | 3 minutes | `MEDIUM` | Infrastructure Alerts |
