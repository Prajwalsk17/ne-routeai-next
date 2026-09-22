import { z } from 'zod';

export const serverEnvSchema = z
  .object({
    APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    NEXT_PUBLIC_APP_NAME: z.string().default('AuraNER'),
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

    // Backend Services
    FASTAPI_BACKEND_URL: z.string().url().default('http://localhost:8000'),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),

    // Supabase credentials (optional in dev when using local/mock providers)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // Firebase (Authentication & FCM)
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),

    // Authentication & Session Security
    JWT_SECRET: z.string().default('ner-routeai-secret-key-sih-2024-production'),

    // AI & Multi-Agent Model Providers
    AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'azure', 'deepseek', 'openrouter', 'none']).default('none'),
    AI_MODEL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),

    // Maps & GIS
    NEXT_PUBLIC_MAP_PROVIDER: z.enum(['maplibre', 'mapbox', 'google', 'leaflet']).default('maplibre'),
    NEXT_PUBLIC_MAP_STYLE_URL: z.string().default('https://tiles.openfreemap.org/styles/liberty'),

    // Routing
    ROUTING_PROVIDER: z.enum(['nextbillion', 'google', 'mapbox', 'osrm', 'graphhopper', 'openrouteservice', 'mock']).default('osrm'),
    ROUTING_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
    NEXTBILLION_API_KEY: z.string().optional(),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    MAPBOX_ACCESS_TOKEN: z.string().optional(),

    // Geocoding
    GEOCODING_PROVIDER: z.enum(['mapbox', 'google', 'nominatim', 'mock']).default('nominatim'),
    GEOCODING_USER_AGENT: z.string().default('AuraNER/1.0 (https://ne-routeai.in)'),

    // Weather
    WEATHER_PROVIDER: z.enum(['tomorrow', 'openweathermap', 'open-meteo', 'mock']).default('open-meteo'),
    WEATHER_STALE_AFTER_SECONDS: z.coerce.number().default(1800),
    TOMORROW_IO_API_KEY: z.string().optional(),
    OPENWEATHERMAP_API_KEY: z.string().optional(),

    // Telemetry
    TELEMETRY_PROVIDER: z.enum(['mock', 'rest', 'supabase_realtime', 'mqtt']).default('mock'),
    TELEMETRY_STALE_AFTER_SECONDS: z.coerce.number().default(60),
    MQTT_BROKER_URL: z.string().optional(),
    MQTT_TOPIC_PREFIX: z.string().default('auraner/telemetry'),

    // Notifications
    NOTIFICATION_PROVIDER: z.enum(['log', 'in_app', 'mock', 'resend', 'twilio']).default('log'),
    RESEND_API_KEY: z.string().optional(),

    // Object Storage
    STORAGE_PROVIDER: z.enum(['local', 'azure_blob', 's3', 'minio']).default('local'),
    STORAGE_BUCKET_NAME: z.string().default('auraner-storage'),

    // Observability
    OPENTELEMETRY_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    AZURE_APP_INSIGHTS_CONNECTION_STRING: z.string().optional(),

    // Feature Flags
    ALLOW_MOCK_PROVIDERS: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
      .default(true),
    NEXT_PUBLIC_ENABLE_VOICE_GUIDANCE: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
      .default(true),
    NEXT_PUBLIC_ENABLE_PWA: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
      .default(false),
  })
  .superRefine((data, ctx) => {
    // Production Safety Invariants
    if (data.APP_ENV === 'production') {
      if (data.ALLOW_MOCK_PROVIDERS === true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ALLOW_MOCK_PROVIDERS'],
          message: 'ALLOW_MOCK_PROVIDERS must not be enabled in production environment.',
        });
      }
      if (data.NEXT_PUBLIC_APP_URL.startsWith('http://') && !data.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_APP_URL'],
          message: 'NEXT_PUBLIC_APP_URL must use secure HTTPS in production environment.',
        });
      }
      if (data.JWT_SECRET === 'ner-routeai-secret-key-sih-2024-production') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Insecure default JWT_SECRET must not be used in production environment.',
        });
      }
    }

    // Staging Safety Invariants
    if (data.APP_ENV === 'staging') {
      if (data.NEXT_PUBLIC_APP_URL.startsWith('http://') && !data.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['NEXT_PUBLIC_APP_URL'],
          message: 'NEXT_PUBLIC_APP_URL must use secure HTTPS in staging environment (unless on localhost for testing).',
        });
      }
      if (data.JWT_SECRET === 'ner-routeai-secret-key-sih-2024-production') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Insecure default JWT_SECRET must not be used in staging environment.',
        });
      }
      if (data.DATABASE_URL && data.DATABASE_URL.includes('prod') && !data.DATABASE_URL.includes('staging')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL in staging must not reference production database hosts or databases.',
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let _env: ServerEnv | null = null;

export function validateEnv(customEnv?: Record<string, unknown>): {
  success: boolean;
  data?: ServerEnv;
  errors?: z.ZodFormattedError<ServerEnv>;
} {
  const envToValidate = customEnv ?? process.env;
  const parsed = serverEnvSchema.safeParse(envToValidate);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.format() as z.ZodFormattedError<ServerEnv>,
    };
  }
  return {
    success: true,
    data: parsed.data,
  };
}

export function getEnv(): ServerEnv {
  if (_env) return _env;

  const result = validateEnv();
  if (!result.success || !result.data) {
    console.error('❌ Invalid environment configuration:', JSON.stringify(result.errors, null, 2));
    throw new Error('Invalid environment configuration');
  }

  _env = result.data;
  return _env;
}

export function resetEnvCache(): void {
  _env = null;
}

export const isProduction = (): boolean => getEnv().APP_ENV === 'production';
export const isStaging = (): boolean => getEnv().APP_ENV === 'staging';
export const isDevelopment = (): boolean => getEnv().APP_ENV === 'development';

export interface StagingInfo {
  isStaging: boolean;
  environment: string;
  allowMockProviders: boolean;
  routingProvider: string;
  telemetryProvider: string;
  weatherProvider: string;
  hasDedicatedDatabase: boolean;
}

export function getStagingInfo(): StagingInfo {
  const currentEnv = getEnv();
  return {
    isStaging: currentEnv.APP_ENV === 'staging',
    environment: currentEnv.APP_ENV,
    allowMockProviders: currentEnv.ALLOW_MOCK_PROVIDERS,
    routingProvider: currentEnv.ROUTING_PROVIDER,
    telemetryProvider: currentEnv.TELEMETRY_PROVIDER,
    weatherProvider: currentEnv.WEATHER_PROVIDER,
    hasDedicatedDatabase: Boolean(currentEnv.DATABASE_URL),
  };
}

export interface ProductionInfo {
  isProduction: boolean;
  environment: string;
  allowMockProviders: boolean;
  routingProvider: string;
  telemetryProvider: string;
  weatherProvider: string;
  notificationProvider: string;
  storageProvider: string;
  hasDedicatedDatabase: boolean;
  hasRedis: boolean;
  hasDedicatedBackend: boolean;
  isHttps: boolean;
}

export function getProductionInfo(): ProductionInfo {
  const currentEnv = getEnv();
  return {
    isProduction: currentEnv.APP_ENV === 'production',
    environment: currentEnv.APP_ENV,
    allowMockProviders: currentEnv.ALLOW_MOCK_PROVIDERS,
    routingProvider: currentEnv.ROUTING_PROVIDER,
    telemetryProvider: currentEnv.TELEMETRY_PROVIDER,
    weatherProvider: currentEnv.WEATHER_PROVIDER,
    notificationProvider: currentEnv.NOTIFICATION_PROVIDER,
    storageProvider: currentEnv.STORAGE_PROVIDER,
    hasDedicatedDatabase: Boolean(currentEnv.DATABASE_URL),
    hasRedis: Boolean(currentEnv.REDIS_URL),
    hasDedicatedBackend: Boolean(currentEnv.FASTAPI_BACKEND_URL && !currentEnv.FASTAPI_BACKEND_URL.includes('localhost')),
    isHttps: currentEnv.NEXT_PUBLIC_APP_URL.startsWith('https://'),
  };
}

export const env = getEnv();


