/**
 * AuraNER / NER-Route AI — Driver Mobile Configuration
 * Supports Development, Staging, and Production environments
 */

const currentEnv = process.env.EXPO_PUBLIC_APP_ENV || 'development';

export const MOBILE_CONFIG = {
  // Current mobile environment
  environment: currentEnv,
  isStaging: currentEnv === 'staging',
  isProduction: currentEnv === 'production',

  // Primary backend API URL with staging resolution
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_URL ||
    (currentEnv === 'staging'
      ? 'https://staging.ne-routeai.in/api/v1'
      : 'https://ne-routeai-next.vercel.app/api/v1'),

  // Fallback local API for debugging
  localApiUrl: 'http://localhost:3000/api/v1',

  // Network request timeout (15 seconds for mountain connectivity)
  requestTimeoutMs: 15000,

  // Offline queue limits
  maxQueuedItems: 500,
  maxRetryAttempts: 5,
  retryDelayMs: 3000,

  // Mountain Driving Safety Rules
  highGradientThresholdPct: 12,
  hazardProximityAlarmKm: 5,
  criticalSosBeaconIntervalMs: 5000,
};

