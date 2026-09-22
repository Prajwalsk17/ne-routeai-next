/**
 * AuraNER / NER-Route AI — Phase 23: Observability Architecture Test Suite
 * 
 * Verifies:
 * 1. OpenTelemetry Tracing & W3C TraceContext (traceparent parsing, serialization, child spans)
 * 2. Operational Metrics Registry (Counter, Gauge, Histogram percentiles, Prometheus format)
 * 3. Request Correlation & Context Propagation
 * 4. Subsystem Telemetry (AI multi-agent, optimization solver, GPS, NER ingestion)
 * 5. Multi-Tier Health Probes (Liveness & Deep Readiness with DB query check)
 * 6. Zero-Leakage & Sensitive Attribute Redaction in Traces
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  Span,
  Tracer,
  defaultTracer,
  generateTraceId,
  generateSpanId,
  parseW3cTraceparent,
  serializeW3cTraceparent,
  getCompletedSpans,
  _resetSpanBuffer,
} from '@/lib/observability/tracer';
import {
  metrics,
  Counter,
  Gauge,
  Histogram,
  httpRequestsTotal,
  httpRequestDurationMs,
  aiAgentExecutionsTotal,
  aiAgentTokenConsumptionTotal,
  optimizationRunsTotal,
  optimizationDurationMs,
  gpsPingsIngestedTotal,
  ingestionJobRunsTotal,
} from '@/lib/observability/metrics';
import {
  resolveRequestCorrelation,
  getCorrelationHeaders,
} from '@/lib/observability/correlation';
import {
  observeAiExecution,
  observeOptimization,
  observeGpsIngest,
  observeExternalIngestion,
} from '@/lib/observability/subsystem-telemetry';
import { GET as getHealthRoute } from '@/app/api/health/route';
import { GET as getMetricsRoute } from '@/app/api/v1/observability/metrics/route';

describe('Phase 23: Production Observability Architecture', () => {
  beforeEach(() => {
    _resetSpanBuffer();
    metrics.resetAll();
  });

  // ---------------------------------------------------------------------------
  // 1. OpenTelemetry Tracing & W3C TraceContext
  // ---------------------------------------------------------------------------
  describe('OpenTelemetry Tracing & W3C TraceContext', () => {
    it('generates valid 32-hex trace IDs and 16-hex span IDs with sufficient entropy', () => {
      const traceId = generateTraceId();
      const spanId = generateSpanId();

      expect(traceId).toHaveLength(32);
      expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);

      expect(spanId).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
    });

    it('parses valid W3C traceparent headers and rejects invalid/all-zero headers', () => {
      const validHeader = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const parsed = parseW3cTraceparent(validHeader);

      expect(parsed).not.toBeNull();
      expect(parsed?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(parsed?.spanId).toBe('00f067aa0ba902b7');
      expect(parsed?.isSampled).toBe(true);

      // Rejections
      expect(parseW3cTraceparent(null)).toBeNull();
      expect(parseW3cTraceparent('invalid-header')).toBeNull();
      expect(parseW3cTraceparent('01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBeNull(); // wrong version
      expect(parseW3cTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBeNull(); // all zeros traceId
      expect(parseW3cTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')).toBeNull(); // all zeros spanId
    });

    it('serializes span context into standard W3C traceparent format', () => {
      const context = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        traceFlags: 1,
        isSampled: true,
      };

      const serialized = serializeW3cTraceparent(context);
      expect(serialized).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    });

    it('spans correctly track attributes, events, error statuses, and duration', () => {
      const tracer = new Tracer('test-service');
      const span = tracer.startSpan('compute_route', {
        attributes: { corridor: 'NH-29', vehicleType: 'HEAVY_TRUCK' },
      });

      span.setAttribute('maxGradient', 14);
      span.addEvent('waypoint_reached', { km: 45 });
      span.setStatus('OK');
      span.end();

      const data = span.toData();
      expect(data.name).toBe('compute_route');
      expect(data.attributes['corridor']).toBe('NH-29');
      expect(data.attributes['vehicleType']).toBe('HEAVY_TRUCK');
      expect(data.attributes['maxGradient']).toBe(14);
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe('waypoint_reached');
      expect(data.statusCode).toBe('OK');
      expect(data.durationMs).toBeGreaterThanOrEqual(0);

      // Verify stored in completed spans buffer
      const completed = getCompletedSpans();
      expect(completed.some((s) => s.spanId === span.spanId)).toBe(true);
    });

    it('creates child spans inheriting the parent trace ID from traceparent', () => {
      const parentTraceparent = '00-e8b39a3f912c482db0e1847e09a30281-1234567890abcdef-01';
      const childSpan = defaultTracer.startSpan('db_query', {
        traceparent: parentTraceparent,
      });

      expect(childSpan.traceId).toBe('e8b39a3f912c482db0e1847e09a30281');
      expect(childSpan.parentSpanId).toBe('1234567890abcdef');
      expect(childSpan.spanId).not.toBe('1234567890abcdef');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Operational Metrics Registry & Prometheus Exporter
  // ---------------------------------------------------------------------------
  describe('Operational Metrics Registry & Prometheus Exporter', () => {
    it('increments Counters and isolates values by label dimensions', () => {
      const counter = new Counter('orders_total', 'Total orders processed');
      counter.inc(1, { status: 'SUCCESS', org: 'org_assam' });
      counter.inc(2, { status: 'SUCCESS', org: 'org_assam' });
      counter.inc(1, { status: 'FAILED', org: 'org_assam' });

      expect(counter.get({ status: 'SUCCESS', org: 'org_assam' })).toBe(3);
      expect(counter.get({ status: 'FAILED', org: 'org_assam' })).toBe(1);
      expect(counter.get({ status: 'UNKNOWN' })).toBe(0);
    });

    it('sets Gauges to arbitrary values and isolates by labels', () => {
      const gauge = new Gauge('fleet_active', 'Active fleet vehicles count');
      gauge.set(42, { state: 'Assam' });
      gauge.set(18, { state: 'Nagaland' });

      expect(gauge.get({ state: 'Assam' })).toBe(42);
      expect(gauge.get({ state: 'Nagaland' })).toBe(18);
    });

    it('records Histograms and computes percentiles (p50, p90, p95, p99)', () => {
      const hist = new Histogram('transit_duration_ms', 'Transit duration in ms', [10, 50, 100, 500]);

      // Record 100 values: 1 to 100 ms
      for (let i = 1; i <= 100; i++) {
        hist.record(i, { corridor: 'NH-37' });
      }

      const stats = hist.getStats({ corridor: 'NH-37' });
      expect(stats.count).toBe(100);
      expect(stats.sum).toBe(5050);
      expect(stats.avg).toBe(50.5);
      expect(stats.p50).toBe(51);
      expect(stats.p90).toBe(91);
      expect(stats.p95).toBe(96);
      expect(stats.p99).toBe(100);
    });

    it('generates valid Prometheus text exposition format', () => {
      const testCounter = metrics.counter('test_pings_total', 'Total pings');
      testCounter.inc(15, { host: 'node-01' });

      const testGauge = metrics.gauge('test_memory_bytes', 'Memory usage bytes');
      testGauge.set(1048576, { type: 'heap' });

      const prometheusOutput = metrics.formatPrometheus();

      expect(prometheusOutput).toContain('# HELP test_pings_total Total pings');
      expect(prometheusOutput).toContain('# TYPE test_pings_total counter');
      expect(prometheusOutput).toContain('test_pings_total{host="node-01"} 15');

      expect(prometheusOutput).toContain('# HELP test_memory_bytes Memory usage bytes');
      expect(prometheusOutput).toContain('# TYPE test_memory_bytes gauge');
      expect(prometheusOutput).toContain('test_memory_bytes{type="heap"} 1048576');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Request Correlation & Context Propagation
  // ---------------------------------------------------------------------------
  describe('Request Correlation & Context Propagation', () => {
    it('preserves existing correlation IDs and extracts traceparent from headers', () => {
      const headers = new Headers();
      headers.set('x-correlation-id', 'corr-custom-9988');
      headers.set('x-request-id', 'req-custom-1122');
      headers.set('traceparent', '00-11112222333344445555666677778888-aaaabbbbccccdddd-01');

      const correlation = resolveRequestCorrelation(headers);
      expect(correlation.correlationId).toBe('corr-custom-9988');
      expect(correlation.requestId).toBe('req-custom-1122');
      expect(correlation.traceId).toBe('11112222333344445555666677778888');

      const respHeaders = getCorrelationHeaders(correlation);
      expect(respHeaders['X-Correlation-ID']).toBe('corr-custom-9988');
      expect(respHeaders['X-Request-ID']).toBe('req-custom-1122');
      expect(respHeaders['traceparent']).toContain('11112222333344445555666677778888');
    });

    it('generates new unique correlation and trace IDs when incoming headers are absent', () => {
      const emptyHeaders = new Headers();
      const correlation = resolveRequestCorrelation(emptyHeaders);

      expect(correlation.correlationId).toBeDefined();
      expect(correlation.requestId).toBeDefined();
      expect(correlation.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Subsystem Observability Wrappers
  // ---------------------------------------------------------------------------
  describe('Subsystem Observability Wrappers', () => {
    it('observeAiExecution records spans, execution counts, and token consumption', async () => {
      const mockResult = await observeAiExecution('AUTONOMOUS_DETOUR_AGENT', 'run-test-01', async (span) => {
        span.setAttribute('test.step', 'route_reroute');
        return {
          result: { detourProposed: true, alternativeKm: 42 },
          promptTokens: 250,
          completionTokens: 80,
          status: 'COMPLETED',
        };
      });

      expect(mockResult.detourProposed).toBe(true);
      expect(aiAgentExecutionsTotal.get({ agent: 'AUTONOMOUS_DETOUR_AGENT', status: 'COMPLETED' })).toBe(1);
      expect(aiAgentTokenConsumptionTotal.get({ agent: 'AUTONOMOUS_DETOUR_AGENT' })).toBe(330);
    });

    it('observeOptimization records solver dimensions and duration metrics', async () => {
      const mockResult = await observeOptimization(
        'OR_TOOLS_CVRP',
        { vehiclesCount: 4, shipmentsCount: 16 },
        async () => {
          return {
            result: { routesPlanned: 4 },
            status: 'FEASIBLE',
            objectiveCost: 1420,
          };
        }
      );

      expect(mockResult.routesPlanned).toBe(4);
      expect(optimizationRunsTotal.get({ solver: 'OR_TOOLS_CVRP', status: 'FEASIBLE' })).toBe(1);
      const stats = optimizationDurationMs.getStats({ solver: 'OR_TOOLS_CVRP' });
      expect(stats.count).toBe(1);
    });

    it('observeGpsIngest updates telemetry ping counters by organization and freshness', () => {
      observeGpsIngest('org_assam_civil', 10, 'LIVE');
      observeGpsIngest('org_assam_civil', 2, 'DEGRADED');

      expect(gpsPingsIngestedTotal.get({ organization: 'org_assam_civil', freshness: 'LIVE' })).toBe(10);
      expect(gpsPingsIngestedTotal.get({ organization: 'org_assam_civil', freshness: 'DEGRADED' })).toBe(2);
    });

    it('observeExternalIngestion records ingestion job runs and status', async () => {
      const res = await observeExternalIngestion('IMD_RADAR', 'job-imd-01', async () => {
        return {
          result: { weatherAlertsIngested: 3 },
          recordCount: 3,
          status: 'SUCCESS',
        };
      });

      expect(res.weatherAlertsIngested).toBe(3);
      expect(ingestionJobRunsTotal.get({ source: 'IMD_RADAR', status: 'SUCCESS' })).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Tier Health Probes
  // ---------------------------------------------------------------------------
  describe('Multi-Tier Health Probes', () => {
    it('GET /api/health returns 200 with liveness metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?probe=liveness');
      const res = await getHealthRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('healthy');
      expect(json.data.probe).toBe('liveness');
      expect(json.data.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/health?probe=readiness tests database health and calculates readiness score', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?probe=readiness');
      const res = await getHealthRoute(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.probe).toBe('readiness');
      expect(json.data.readiness_score_pct).toBeGreaterThan(0);
      expect(json.data.checks.database).toBeDefined();
      expect(json.data.checks.database.details.local_db_alive).toBe(true);
      expect(json.data.checks.memory).toBeDefined();
      expect(json.data.checks.providers).toBeDefined();
    });

    it('GET /api/v1/observability/metrics returns Prometheus text scrape content', async () => {
      httpRequestsTotal.inc(7, { method: 'GET', path: '/api/v1/routes', status: '200' });

      const req = new NextRequest('http://localhost:3000/api/v1/observability/metrics');
      const res = await getMetricsRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');
      const text = await res.text();
      expect(text).toContain('http_requests_total');
      expect(text).toContain('path="/api/v1/routes"');
      expect(text).toContain('status="200"');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Zero Sensitive Leakage in Traces
  // ---------------------------------------------------------------------------
  describe('Zero-Leakage Invariant in Traces & Metrics', () => {
    it('spans automatically redact sensitive attribute keys', () => {
      const span = defaultTracer.startSpan('user_login');
      span.setAttribute('userId', 'usr_8821');
      span.setAttribute('password', 'secretP@ssword');
      span.setAttribute('authToken', 'eyJhbGciOiJIUzI1NiJ9.test');
      span.setAttribute('apiKey', 'nb_live_123456');
      span.setAttribute('secretCode', 'otp-999');
      span.end();

      const data = span.toData();
      expect(data.attributes['userId']).toBe('usr_8821');
      expect(data.attributes['password']).toBe('[REDACTED]');
      expect(data.attributes['authToken']).toBe('[REDACTED]');
      expect(data.attributes['apiKey']).toBe('[REDACTED]');
      expect(data.attributes['secretCode']).toBe('[REDACTED]');
    });
  });
});
