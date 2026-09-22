import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getProductionSecurityHeaders, getCorsHeaders, validateCsrfOrigin } from '@/lib/security/headers';
import { checkRateLimit, getClientIp } from '@/lib/security/rate-limiter';
import { resolveRequestCorrelation, getCorrelationHeaders } from '@/lib/observability/correlation';
import { httpRequestsTotal, httpRequestDurationMs } from '@/lib/observability/metrics';

const PUBLIC_PAGES = ['/', '/login', '/signup'];
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health', '/api/v1/observability/metrics'];

/**
 * Attaches production security headers, CORS headers, and request correlation headers to any NextResponse,
 * and records operational metrics.
 */
function attachObservabilityAndSecurity(
  response: NextResponse,
  requestOrigin: string | null,
  correlationHeaders: Record<string, string>,
  method?: string,
  pathname?: string,
  startTime?: number
): NextResponse {
  const secHeaders = getProductionSecurityHeaders();
  const corsHeaders = getCorsHeaders(requestOrigin);

  for (const [k, v] of Object.entries(secHeaders)) {
    response.headers.set(k, v);
  }
  for (const [k, v] of Object.entries(corsHeaders)) {
    if (v) response.headers.set(k, v);
  }
  for (const [k, v] of Object.entries(correlationHeaders)) {
    response.headers.set(k, v);
  }

  if (method && pathname) {
    httpRequestsTotal.inc(1, { method, path: pathname, status: String(response.status) });
    if (startTime) {
      httpRequestDurationMs.record(Date.now() - startTime, { method, path: pathname });
    }
  }

  return response;
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const correlation = resolveRequestCorrelation(request.headers);
  const correlationHeaders = getCorrelationHeaders(correlation);

  // 1. Static files, Next internals, and public assets bypass security filtering
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // favicon.ico, images, fonts
  ) {
    return NextResponse.next();
  }

  // 2. CORS Preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    return attachObservabilityAndSecurity(preflightResponse, origin, correlationHeaders, request.method, pathname, startTime);
  }

  // 3. Extract credentials & IP
  const token =
    request.cookies.get('ner_session')?.value ||
    request.cookies.get('ner_token')?.value ||
    request.cookies.get('sb-access-token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/, '');

  const isAuthenticated = Boolean(token && token.trim().length > 0);
  const isPublicPage = PUBLIC_PAGES.includes(pathname);
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const clientIp = getClientIp(request.headers);

  // 4. Rate Limiting for Authentication endpoints
  if (pathname.startsWith('/api/auth/')) {
    const authRate = checkRateLimit(clientIp, 'AUTH');
    if (!authRate.allowed) {
      const res = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please slow down.',
          },
          meta: {
            timestamp: new Date().toISOString(),
            retryAfter: authRate.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(authRate.retryAfterSeconds || 60),
            'X-RateLimit-Limit': String(authRate.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(authRate.resetSeconds),
          },
        }
      );
      return attachObservabilityAndSecurity(res, origin, correlationHeaders, request.method, pathname, startTime);
    }
  }

  // 5. CSRF Origin Verification on state-changing API requests
  if (pathname.startsWith('/api/')) {
    const csrfCheck = validateCsrfOrigin(request.method, request.headers, request.url);
    if (!csrfCheck.valid) {
      const res = NextResponse.json(
        {
          success: false,
          error: {
            code: 'CSRF_VALIDATION_FAILED',
            message: `Forbidden: ${csrfCheck.reason || 'Untrusted origin.'}`,
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
      return attachObservabilityAndSecurity(res, origin, correlationHeaders, request.method, pathname, startTime);
    }

    // 6. Rate Limiting for Mutating API requests
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
    if (isStateChanging) {
      const rateKey = `${clientIp}:${token ? token.slice(-8) : 'anon'}`;
      const apiRate = checkRateLimit(rateKey, 'MUTATING_API');
      if (!apiRate.allowed) {
        const res = NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'API mutation request quota exceeded. Please slow down.',
            },
            meta: {
              timestamp: new Date().toISOString(),
              retryAfter: apiRate.retryAfterSeconds,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(apiRate.retryAfterSeconds || 60),
              'X-RateLimit-Limit': String(apiRate.limit),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(apiRate.resetSeconds),
            },
          }
        );
        return attachObservabilityAndSecurity(res, origin, correlationHeaders, request.method, pathname, startTime);
      }
    }

    // 7. Protected API Authorization Gate
    if (!isPublicApi && !isAuthenticated) {
      const res = NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please sign in.',
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
      return attachObservabilityAndSecurity(res, origin, correlationHeaders, request.method, pathname, startTime);
    }

    const nextResponse = NextResponse.next();
    return attachObservabilityAndSecurity(nextResponse, origin, correlationHeaders, request.method, pathname, startTime);
  }

  // 8. Page Navigation & Redirections
  // Protected pages require an active authentication token; unauthenticated visits redirect to /login
  if (!isAuthenticated && !isPublicPage) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    const redirectRes = NextResponse.redirect(loginUrl);
    return attachObservabilityAndSecurity(redirectRes, origin, correlationHeaders, request.method, pathname, startTime);
  }

  const res = NextResponse.next();
  return attachObservabilityAndSecurity(res, origin, correlationHeaders, request.method, pathname, startTime);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
