import { z } from 'zod';

const serverEnvSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().default('AuraNER'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Supabase credentials (optional in dev when using local/mock providers)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Providers
  NEXT_PUBLIC_MAP_PROVIDER: z.enum(['maplibre', 'mapbox', 'google', 'leaflet']).default('maplibre'),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().default('https://tiles.openfreemap.org/styles/liberty'),

  ROUTING_PROVIDER: z.enum(['nextbillion', 'google', 'mapbox', 'osrm', 'graphhopper', 'openrouteservice', 'mock']).default('osrm'),
  ROUTING_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
  NEXTBILLION_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),

  GEOCODING_PROVIDER: z.enum(['mapbox', 'google', 'nominatim', 'mock']).default('nominatim'),
  GEOCODING_USER_AGENT: z.string().default('AuraNER/1.0 (https://ne-routeai.in)'),

  WEATHER_PROVIDER: z.enum(['tomorrow', 'openweathermap', 'open-meteo', 'mock']).default('open-meteo'),
  WEATHER_STALE_AFTER_SECONDS: z.coerce.number().default(1800),
  TOMORROW_IO_API_KEY: z.string().optional(),
  OPENWEATHERMAP_API_KEY: z.string().optional(),

  TELEMETRY_PROVIDER: z.enum(['mock', 'rest', 'supabase_realtime', 'mqtt']).default('mock'),
  TELEMETRY_STALE_AFTER_SECONDS: z.coerce.number().default(60),
  MQTT_BROKER_URL: z.string().optional(),
  MQTT_TOPIC_PREFIX: z.string().default('auraner/telemetry'),

  NOTIFICATION_PROVIDER: z.enum(['log', 'in_app', 'mock', 'resend', 'twilio']).default('log'),

  // Feature Flags
  ALLOW_MOCK_PROVIDERS: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_VOICE_GUIDANCE: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
  NEXT_PUBLIC_ENABLE_PWA: z.enum(['true', 'false']).transform((v) => v === 'true').default('false'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _env: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (_env) return _env;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment configuration');
  }

  _env = parsed.data;
  return _env;
}

export const env = getEnv();
