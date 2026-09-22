import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { POST as postSession } from '@/app/api/auth/session/route';
import { POST as postSignout } from '@/app/api/auth/signout/route';
import { GET as getMe } from '@/app/api/auth/me/route';
import {
  extractAuthErrorCode,
  getReadableAuthError,
  safeAuthErrorMessage,
} from '@/lib/auth/auth-errors';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { SESSION_COOKIE_NAME, CLIENT_TOKEN_COOKIE_NAME } from '@/lib/auth/session';

function createRequest(
  method: string,
  pathname: string,
  options?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    body?: unknown;
  }
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  const reqHeaders = new Headers();
  reqHeaders.set('Content-Type', 'application/json');

  if (options?.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      reqHeaders.set(k, v);
    }
  }

  if (options?.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    reqHeaders.set('Cookie', cookieHeader);
  }

  return new NextRequest(url, {
    method,
    headers: reqHeaders,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  } as any);
}

describe('Landing Page Entry & Authentication Flow Verification', () => {
  // =========================================================================
  // 1. ROUTING & MIDDLEWARE PROTECTION CONTRACT
  // =========================================================================
  describe('1. Routing & Route Guard Contract', () => {
    it('allows public landing page (/) to load without redirection', () => {
      const req = createRequest('GET', '/');
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows public login page (/login) to load without redirection for unauthenticated user', () => {
      const req = createRequest('GET', '/login');
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('allows public signup page (/signup) to load without redirection for unauthenticated user', () => {
      const req = createRequest('GET', '/signup');
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });

    it('redirects unauthenticated user visiting protected /dispatch to /login?from=/dispatch', () => {
      const req = createRequest('GET', '/dispatch');
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('from=%2Fdispatch');
    });

    it('allows authenticated user with valid session cookie to access protected /dispatch', () => {
      const validToken = signAuthToken({
        userId: 'usr_test_auth',
        email: 'dispatcher@assam.gov.in',
        role: 'DISPATCHER',
        name: 'Officer Barua',
        organizationId: 'org_assam_civil_supplies',
      });

      const req = createRequest('GET', '/dispatch', {
        cookies: { [SESSION_COOKIE_NAME]: validToken },
      });
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    });
  });

  // =========================================================================
  // 2. SERVER SESSION & SIGNOUT API ENDPOINTS
  // =========================================================================
  describe('2. Server Session & Signout Architecture', () => {
    it('POST /api/auth/session rejects requests missing idToken with 400', async () => {
      const req = createRequest('POST', '/api/auth/session', { body: {} });
      const res = await postSession(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('POST /api/auth/session establishes session and sets secure cookies for valid token', async () => {
      const testToken = signAuthToken({
        userId: 'usr_test_session',
        email: 'session.test@ner-routeai.in',
        role: 'DISPATCHER',
        name: 'Session Test User',
      });

      const req = createRequest('POST', '/api/auth/session', {
        body: { idToken: testToken, name: 'Session Test User' },
      });
      const res = await postSession(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user).toBeDefined();
      expect(json.data.user.email).toBe('session.test@ner-routeai.in');
      expect(json.data.token).toBeDefined();

      // Verify session cookies attached
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain(SESSION_COOKIE_NAME);
      expect(setCookie).toContain(CLIENT_TOKEN_COOKIE_NAME);
    });

    it('GET /api/auth/me resolves identity from session cookie', async () => {
      const sessionToken = signAuthToken({
        userId: 'usr_me_test',
        email: 'me.test@assam.gov.in',
        role: 'DISPATCHER',
        name: 'Me Test',
        organizationId: 'org_assam_civil_supplies',
      });

      const req = createRequest('GET', '/api/auth/me', {
        cookies: { [SESSION_COOKIE_NAME]: sessionToken },
      });
      const res = await getMe(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.id).toBe('usr_me_test');
      expect(json.data.user.email).toBe('me.test@assam.gov.in');
      expect(json.data.isAuthenticated).toBe(true);
    });

    it('POST /api/auth/signout terminates session and clears cookies', async () => {
      const res = await postSignout();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.signedOut).toBe(true);

      const setCookie = res.headers.get('set-cookie') || '';
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(setCookie).toContain('Max-Age=0');
    });
  });

  // =========================================================================
  // 3. AUTHENTICATION ERROR NORMALIZATION
  // =========================================================================
  describe('3. Error Normalization & Safe String Guarantee', () => {
    it('normalizes all standard Firebase error codes to readable strings', () => {
      const errorCases: Array<{ code: string; expectedSubstring: string; context?: any }> = [
        { code: 'auth/popup-closed-by-user', expectedSubstring: 'cancelled' },
        { code: 'auth/popup-blocked', expectedSubstring: 'pop-up' },
        { code: 'auth/invalid-credential', expectedSubstring: 'incorrect' },
        { code: 'auth/user-not-found', expectedSubstring: 'No account was found' },
        { code: 'auth/wrong-password', expectedSubstring: 'incorrect' },
        { code: 'auth/invalid-email', expectedSubstring: 'valid email' },
        { code: 'auth/email-already-in-use', expectedSubstring: 'already exists' },
        { code: 'auth/weak-password', expectedSubstring: 'at least 6 characters' },
        { code: 'auth/too-many-requests', expectedSubstring: 'Too many' },
        { code: 'auth/invalid-verification-code', expectedSubstring: 'verification code is incorrect' },
        { code: 'auth/code-expired', expectedSubstring: 'expired' },
        { code: 'auth/operation-not-allowed', expectedSubstring: 'disabled' },
        { code: 'auth/network-request-failed', expectedSubstring: 'Network error' },
      ];

      for (const tc of errorCases) {
        const errorObj = { code: tc.code, message: `Firebase: Error (${tc.code})` };
        const readable = getReadableAuthError(errorObj, tc.context || 'general');
        expect(readable).toBeTypeOf('string');
        expect(readable.toLowerCase()).toContain(tc.expectedSubstring.toLowerCase());
      }
    });

    it('safeAuthErrorMessage guarantees non-object string output in all edge cases', () => {
      // 1. String input
      expect(safeAuthErrorMessage('Already string')).toBe('Already string');

      // 2. Error object
      expect(safeAuthErrorMessage(new Error('Standard Error'))).toBe('Standard Error');

      // 3. Complex nested object (must never return [object Object])
      const complexObject = {
        code: 'auth/unknown',
        error: { message: 'Nested failure description' },
      };
      const result = safeAuthErrorMessage(complexObject);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('[object Object]');
      expect(result).toBe('Nested failure description');

      // 4. Null / Undefined
      expect(safeAuthErrorMessage(null)).toBe('');
      expect(safeAuthErrorMessage(undefined)).toBe('');
    });

    it('extractAuthErrorCode properly identifies Firebase error patterns', () => {
      expect(extractAuthErrorCode({ code: 'auth/user-not-found' })).toBe('auth/user-not-found');
      expect(extractAuthErrorCode(new Error('Firebase: Error (auth/invalid-email).'))).toBe('auth/invalid-email');
      expect(extractAuthErrorCode('Something failed with auth/popup-blocked')).toBe('auth/popup-blocked');
      expect(extractAuthErrorCode(null)).toBeNull();
    });
  });
});
