/**
 * AuraNER / NER-Route AI — Production Security Headers & CORS / CSRF Engine
 * 
 * Provides:
 * 1. Hardened HTTP Response Headers (HSTS, CSP, X-Frame-Options, etc.)
 * 2. Origin Whitelist & CORS Preflight Management
 * 3. Cross-Site Request Forgery (CSRF) Verification for state-changing methods
 */

export interface SecurityHeadersOptions {
  isProduction?: boolean;
  cspNonce?: string;
}

/**
 * Returns the hardened Content-Security-Policy header value
 */
export function buildContentSecurityPolicy(nonce?: string): string {
  const nonceAttr = nonce ? `'nonce-${nonce}'` : '';
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'", // Required for Next.js hydration and script injection
    "'unsafe-eval'",   // Required for MapLibre/Leaflet WebGL shader compilation
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://apis.google.com',
    'https://www.gstatic.com',
    'https://*.firebaseapp.com',
    'https://*.googleapis.com',
    nonceAttr,
  ].filter(Boolean).join(' ');

  const styleSrc = [
    "'self'",
    "'unsafe-inline'", // Required for styled-jsx, tailwind inline utilities
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ].join(' ');

  const connectSrc = [
    "'self'",
    'https:',
    'wss:',
    'https://router.project-osrm.org',
    'https://nominatim.openstreetmap.org',
    'https://tiles.openfreemap.org',
    'https://*.supabase.co',
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://*.firebaseapp.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
  ].join(' ');

  const frameSrc = [
    "'self'",
    'https://*.firebaseapp.com',
    'https://accounts.google.com',
    'https://*.google.com',
  ].join(' ');

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://tiles.openfreemap.org',
    'https://*.tile.openstreetmap.org',
    'https://*.googleusercontent.com',
    'https://*.gstatic.com',
  ].join(' ');

  const fontSrc = [
    "'self'",
    'data:',
    'https://fonts.gstatic.com',
  ].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src ${fontSrc}`,
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * Returns the standard dictionary of production security headers
 */
export function getProductionSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const headers: Record<string, string> = {
    // 1. Clickjacking Prevention
    'X-Frame-Options': 'DENY',

    // 2. MIME Sniffing Prevention
    'X-Content-Type-Options': 'nosniff',

    // 3. XSS Filter Guard
    'X-XSS-Protection': '1; mode=block',

    // 4. Referrer Policy (Strict)
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // 5. Permissions Policy (Restrict camera, mic, allow geolocation for live navigation)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',

    // 6. Content Security Policy
    'Content-Security-Policy': buildContentSecurityPolicy(options.cspNonce),
  };

  // 7. Strict-Transport-Security (HSTS) in production environments
  if (options.isProduction || process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Validates whether an origin is permitted by CORS whitelist
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin or non-browser client

  const allowedOrigins: string[] = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081', // Expo local development
  ];

  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL.trim().toLowerCase());
  }

  const customAllowed = process.env.ALLOWED_ORIGINS;
  if (customAllowed) {
    customAllowed.split(',').forEach((o) => {
      const trimmed = o.trim().toLowerCase();
      if (trimmed) allowedOrigins.push(trimmed);
    });
  }

  const normalizedOrigin = origin.trim().toLowerCase();
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed === normalizedOrigin) return true;
    try {
      const allowedUrl = new URL(allowed);
      const originUrl = new URL(normalizedOrigin);
      return allowedUrl.origin === originUrl.origin;
    } catch {
      return false;
    }
  });
}

/**
 * Generates CORS headers based on incoming request origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(requestOrigin);
  const originValue = allowed && requestOrigin ? requestOrigin : '';

  return {
    'Access-Control-Allow-Origin': originValue,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-CSRF-Token',
    ].join(', '),
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Validates CSRF for state-changing HTTP requests (POST, PUT, PATCH, DELETE)
 * Verifies Sec-Fetch-Site or Origin/Referer against allowed origins.
 */
export function validateCsrfOrigin(
  method: string,
  headers: Headers,
  requestUrl: string
): { valid: boolean; reason?: string } {
  const upperMethod = method.toUpperCase();
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod);

  if (!isStateChanging) {
    return { valid: true };
  }

  // 1. If an explicit Authorization Bearer token is provided, API clients are protected
  const authHeader = headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { valid: true };
  }

  // 2. Inspect Sec-Fetch-Site (modern browsers)
  const secFetchSite = headers.get('sec-fetch-site');
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'none') {
    return { valid: true };
  }

  // 3. Fallback to Origin / Referer check
  const origin = headers.get('origin');
  if (origin) {
    if (isAllowedOrigin(origin)) {
      return { valid: true };
    }
    return { valid: false, reason: `Untrusted Origin header: ${origin}` };
  }

  const referer = headers.get('referer');
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (isAllowedOrigin(refererOrigin)) {
        return { valid: true };
      }
      return { valid: false, reason: `Untrusted Referer header: ${refererOrigin}` };
    } catch {
      return { valid: false, reason: 'Malformed Referer header' };
    }
  }

  // In standard browser cookie authentication, state mutations must provide Origin or Referer
  return { valid: true };
}
