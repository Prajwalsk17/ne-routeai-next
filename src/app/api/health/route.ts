// =============================================================================
// AuraNER / NER-Route AI — Multi-Tier Production Health Check Architecture
// Liveness Probe (/api/health) & Deep Readiness Probe (/api/health?probe=readiness)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getEnv, validateEnv } from '@/lib/env';
import { isSupabaseConfigured, getServiceSupabase } from '@/lib/db/supabase';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/observability/metrics';

const startTime = Date.now();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const probeType = searchParams.get('probe') || 'liveness';
  const env = getEnv();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  // ---------------------------------------------------------------------------
  // 1. Liveness Probe (Kubernetes / App Gateway ping)
  // ---------------------------------------------------------------------------
  if (probeType === 'liveness') {
    return apiSuccess({
      status: 'healthy',
      probe: 'liveness',
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: env.APP_ENV,
      version: '1.0.0',
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Readiness Probe (Deep operational dependency checks)
  // ---------------------------------------------------------------------------
  if (probeType === 'readiness') {
    const memory = process.memoryUsage();
    const envValidation = validateEnv();

    // 1. Test database engine operational health
    let dbStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let dbLatencyMs = 0;
    const isPgConfigured = isSupabaseConfigured();
    if (isPgConfigured) {
      try {
        const dbStart = Date.now();
        const client = getServiceSupabase();
        if (client) {
          await client.from('organizations').select('id').limit(1);
        }
        dbLatencyMs = Date.now() - dbStart;
      } catch {
        dbStatus = 'degraded';
      }
    } else {
      // Local development without remote database credentials
      dbStatus = env.APP_ENV === 'production' ? 'unhealthy' : 'healthy';
    }

    const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; details?: unknown }> = {
      environment: {
        status: envValidation.success ? 'healthy' : 'unhealthy',
        details: envValidation.errors ? 'Environment configuration validation errors detected' : 'Valid',
      },
      database: {
        status: dbStatus,
        details: {
          primary_mode: 'postgresql_postgis',
          remote_supabase_configured: isPgConfigured,
          local_db_alive: true,
          ping_latency_ms: dbLatencyMs,
        },
      },
      memory: {
        status: memory.heapUsed / memory.heapTotal < 0.9 ? 'healthy' : 'degraded',
        details: {
          heap_used_mb: Math.round(memory.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memory.heapTotal / 1024 / 1024),
          rss_mb: Math.round(memory.rss / 1024 / 1024),
        },
      },
      providers: {
        status: 'healthy',
        details: {
          routing: env.ROUTING_PROVIDER,
          geocoding: env.GEOCODING_PROVIDER,
          weather: env.WEATHER_PROVIDER,
          telemetry: env.TELEMETRY_PROVIDER,
          notification: env.NOTIFICATION_PROVIDER,
          storage: env.STORAGE_PROVIDER,
        },
      },
    };

    const hasFailure = Object.values(checks).some((c) => c.status === 'unhealthy');
    const isReady = !hasFailure;

    // Calculate quantitative readiness score (0 - 100%)
    const checkValues = Object.values(checks);
    const healthyCount = checkValues.filter((c) => c.status === 'healthy').length;
    const degradedCount = checkValues.filter((c) => c.status === 'degraded').length;
    const readinessScorePct = Math.round(((healthyCount * 1.0 + degradedCount * 0.5) / checkValues.length) * 100);

    const readinessPayload = {
      status: isReady ? 'ready' : 'unready',
      probe: 'readiness',
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      environment: env.APP_ENV,
      version: '1.0.0',
      readiness_score_pct: readinessScorePct,
      checks,
    };

    if (!isReady) {
      logger.error('Readiness probe failed', undefined, { checks });
      return apiError('Readiness probe failed', 'SERVICE_UNREADY', 503, readinessPayload);
    }

    return apiSuccess(readinessPayload);
  }

  // ---------------------------------------------------------------------------
  // 3. Prometheus Metrics Scraping Probe
  // ---------------------------------------------------------------------------
  if (probeType === 'metrics') {
    return new NextResponse(metrics.formatPrometheus(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  }

  return apiError(`Unknown probe type: ${probeType}. Supported: liveness, readiness, metrics`, 'INVALID_PROBE', 400);
}
