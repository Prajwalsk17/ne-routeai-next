import { NextResponse } from 'next/server';
import { apiSuccess } from '@/lib/api/response';
import { getEnv } from '@/lib/env';
import { isSupabaseConfigured } from '@/lib/db/supabase';

const startTime = Date.now();

export async function GET(): Promise<NextResponse> {
  const env = getEnv();

  const healthData = {
    status: 'healthy',
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    environment: env.APP_ENV,
    version: '1.0.0',
    database: {
      supabase_configured: isSupabaseConfigured(),
      mode: isSupabaseConfigured() ? 'postgresql_postgis' : 'sqlite_dev_fallback',
    },
    providers: {
      routing: env.ROUTING_PROVIDER,
      geocoding: env.GEOCODING_PROVIDER,
      weather: env.WEATHER_PROVIDER,
      telemetry: env.TELEMETRY_PROVIDER,
      notifications: env.NOTIFICATION_PROVIDER,
    },
  };

  return apiSuccess(healthData);
}
