/**
 * AuraNER / NER-Route AI — Production Rate Limiting Engine
 * 
 * Implements an in-memory sliding window rate limiter with token bucket dynamics.
 * Supports distinct security tiers:
 * - AUTH: 5 requests / 60 seconds (brute force protection on login, OTP, recovery)
 * - MUTATING_API: 60 requests / 60 seconds (prevents rapid-fire resource creation/tampering)
 * - PUBLIC_READ: 120 requests / 60 seconds (general read endpoints)
 */

export type RateLimitTier = 'AUTH' | 'MUTATING_API' | 'PUBLIC_READ';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

export const RATE_LIMIT_TIERS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
  },
  MUTATING_API: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 60 requests per minute
  },
  PUBLIC_READ: {
    maxRequests: 120,
    windowMs: 60 * 1000, // 120 requests per minute
  },
};

interface WindowRecord {
  timestamps: number[];
}

const windowStore = new Map<string, WindowRecord>();

/**
 * Resets the in-memory rate limiting store (useful for testing)
 */
export function _resetRateLimiterStore(): void {
  windowStore.clear();
}

/**
 * Extracts a reliable client IP from standard HTTP headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

/**
 * Checks and records an access event against the specified rate limit tier
 */
export function checkRateLimit(
  key: string,
  tier: RateLimitTier = 'MUTATING_API',
  customConfig?: Partial<RateLimitConfig>
): RateLimitResult {
  const config: RateLimitConfig = {
    ...RATE_LIMIT_TIERS[tier],
    ...customConfig,
  };

  const now = Date.now();
  const windowStart = now - config.windowMs;

  const fullKey = `${tier}:${key}`;
  let record = windowStore.get(fullKey);

  if (!record) {
    record = { timestamps: [] };
    windowStore.set(fullKey, record);
  }

  // Filter out timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  const requestCount = record.timestamps.length;
  const remaining = Math.max(0, config.maxRequests - requestCount);

  if (requestCount >= config.maxRequests) {
    // Oldest timestamp in window determines when the next slot frees up
    const oldest = record.timestamps[0] || windowStart;
    const retryAfterMs = Math.max(0, oldest + config.windowMs - now);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetSeconds: retryAfterSeconds,
      retryAfterSeconds,
    };
  }

  // Record this request
  record.timestamps.push(now);

  const resetSeconds = Math.max(1, Math.ceil(config.windowMs / 1000));

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    resetSeconds,
  };
}
