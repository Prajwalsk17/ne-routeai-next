import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { getCompletedSpans } from '@/lib/observability/tracer';
import {
  httpRequestsTotal,
  httpRequestDurationMs,
  routeCalculationDurationMs,
  gpsPingsIngestedTotal,
  activeFleetVehicles,
  aiAgentExecutionsTotal,
  optimizationRunsTotal,
  ingestionJobRunsTotal,
  activeAlertsGauge,
} from '@/lib/observability/metrics';
import { getEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'audit:read');
    const env = getEnv();

    const spans = getCompletedSpans(25);
    const memory = process.memoryUsage();

    const snapshot = {
      service: 'ne-routeai-web',
      environment: env.APP_ENV,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      requestedBy: {
        userId: user.id,
        role: user.role,
        organizationId: user.organizationId,
      },
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024),
      },
      recentSpans: spans.map((s) => ({
        traceId: s.traceId,
        spanId: s.spanId,
        parentSpanId: s.parentSpanId,
        name: s.name,
        kind: s.kind,
        durationMs: s.durationMs,
        statusCode: s.statusCode,
        statusDescription: s.statusDescription,
        startTime: new Date(s.startTimeMs).toISOString(),
      })),
      metricsSummary: {
        httpRequests: httpRequestsTotal.getValues(),
        httpDurationStats: httpRequestDurationMs.getStats(),
        routeCalculationStats: routeCalculationDurationMs.getStats(),
        gpsPingsTotal: gpsPingsIngestedTotal.getValues(),
        activeVehicles: activeFleetVehicles.getValues(),
        aiAgentExecutions: aiAgentExecutionsTotal.getValues(),
        optimizationRuns: optimizationRunsTotal.getValues(),
        ingestionJobRuns: ingestionJobRunsTotal.getValues(),
        activeAlerts: activeAlertsGauge.getValues(),
      },
      operationalAlertThresholds: {
        httpErrorRateP99: 'Trigger CRITICAL if > 1.0% over 3 min',
        routeCalculationP95: 'Trigger HIGH if > 3,000ms over 5 min',
        telemetryStreamLag: 'Trigger HIGH if > 30 seconds',
        memoryUsageThreshold: 'Trigger WARNING if heap > 85%',
      },
    };

    return apiSuccess(snapshot);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
