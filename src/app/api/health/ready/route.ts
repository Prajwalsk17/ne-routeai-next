// =============================================================================
// AuraNER / NER-Route AI — Dedicated Readiness Endpoint (/api/health/ready)
// Direct probe endpoint for Kubernetes / Azure Container Apps ingress controllers
// =============================================================================

import { NextResponse } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getEnv, validateEnv, getStagingInfo, getProductionInfo } from '@/lib/env';
import { isSupabaseConfigured, getServiceSupabase } from '@/lib/db/supabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const env = getEnv();
  const memory = process.memoryUsage();
  const envValidation = validateEnv();

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
    dbStatus = env.APP_ENV === 'production' ? 'unhealthy' : 'healthy';
  }

  const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; details?: unknown }> = {
    environment: {
      status: envValidation.success ? 'healthy' : 'unhealthy',
      details: {
        environment: env.APP_ENV,
        isStaging: env.APP_ENV === 'staging',
        isProduction: env.APP_ENV === 'production',
        mockProvidersAllowed: env.ALLOW_MOCK_PROVIDERS,
        validation: envValidation.success ? 'VALID' : 'INVALID',
      },
    },
    database: {
      status: dbStatus,
      details: {
        primary_mode: 'postgresql_postgis',
        remote_supabase_configured: isPgConfigured,
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
    staging_parity: {
      status: 'healthy',
      details: getStagingInfo(),
    },
    production_parity: {
      status: 'healthy',
      details: getProductionInfo(),
    },
  };

  const hasFailure = Object.values(checks).some((c) => c.status === 'unhealthy');
  const isReady = !hasFailure;

  const checkValues = Object.values(checks);
  const healthyCount = checkValues.filter((c) => c.status === 'healthy').length;
  const degradedCount = checkValues.filter((c) => c.status === 'degraded').length;
  const readinessScorePct = Math.round(((healthyCount * 1.0 + degradedCount * 0.5) / checkValues.length) * 100);

  const payload = {
    status: isReady ? 'ready' : 'unready',
    probe: 'readiness',
    timestamp: new Date().toISOString(),
    environment: env.APP_ENV,
    is_staging: env.APP_ENV === 'staging',
    version: '1.0.0',
    readiness_score_pct: readinessScorePct,
    checks,
  };

  if (!isReady) {
    logger.error('Readiness probe failed at /api/health/ready', undefined, { checks });
    return apiError('Readiness probe failed', 'SERVICE_UNREADY', 503, payload);
  }

  return apiSuccess(payload);
}
