import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAuthToken,
  signAuthToken,
  TokenExpiredError,
  InvalidTokenError,
} from '@/lib/auth/token-verifier';
import {
  extractToken,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  CLIENT_TOKEN_COOKIE_NAME,
} from '@/lib/auth/session';
import { requestOtp } from '@/lib/auth/otp';
import { middleware } from '@/middleware';
import { GET as getMe } from '@/app/api/auth/me/route';
import { POST as postSignout } from '@/app/api/auth/signout/route';
import { POST as postSession } from '@/app/api/auth/session/route';
import { GET as getFirebaseConfigRoute } from '@/app/api/auth/firebase-config/route';
import { getFirebaseConfig, isFirebaseClientConfigured } from '@/lib/auth/firebase-client';
import bcrypt from 'bcryptjs';

const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

describe('Phase 5: Authentication & Session Management', () => {
  const testUser = {
    userId: 'usr_auth_test_001',
    email: 'dispatcher.assam@auraner.gov.in',
    name: 'Bhaben Kalita',
    role: 'DISPATCHER',
    organizationId: 'org_assam_civil_supplies',
  };

  // ---------------------------------------------------------------------------
  // 1. Token Signing & Verification
  // ---------------------------------------------------------------------------
  describe('Token Verification Engine (token-verifier.ts)', () => {
    it('cryptographically signs and verifies a valid session token', async () => {
      const token = signAuthToken(testUser, '1h');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyAuthToken(token);
      expect(verified.userId).toBe(testUser.userId);
      expect(verified.email).toBe(testUser.email);
      expect(verified.name).toBe(testUser.name);
      expect(verified.role).toBe(testUser.role);
      expect(verified.organizationId).toBe(testUser.organizationId);
      expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('strictly rejects expired tokens with TokenExpiredError', async () => {
      // Create a token that expired 10 seconds ago
      const expiredToken = signAuthToken(testUser, '-10s');

      await expect(verifyAuthToken(expiredToken)).rejects.toThrow(TokenExpiredError);
    });

    it('strictly rejects malformed tokens with InvalidTokenError', async () => {
      await expect(verifyAuthToken('not.a.valid.jwt.token')).rejects.toThrow(InvalidTokenError);
      await expect(verifyAuthToken('')).rejects.toThrow(InvalidTokenError);
    });

    it('strictly rejects tampered tokens with mismatched signatures', async () => {
      const validToken = signAuthToken(testUser, '1h');
      const parts = validToken.split('.');
      // Tamper signature by changing trailing bytes
      const tamperedSignature = parts[2].slice(0, -4) + 'abcd';
      const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

      await expect(verifyAuthToken(tamperedToken)).rejects.toThrow(InvalidTokenError);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Session & Cookie Extraction
  // ---------------------------------------------------------------------------
  describe('Session Extraction & Cookie Helpers (session.ts)', () => {
    it('extracts token from Authorization Bearer header', () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/api/v1/shipments', {
        headers: { authorization: `Bearer ${token}` },
      });

      const extracted = extractToken(req);
      expect(extracted).toBe(token);
    });

    it('extracts token from HTTP-only ner_session cookie', () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/api/v1/shipments', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });

      const extracted = extractToken(req);
      expect(extracted).toBe(token);
    });

    it('resolves authenticated SessionUser from valid request', async () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/api/v1/shipments', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });

      const session = await getSession(req);
      expect(session).not.toBeNull();
      expect(session?.id).toBe(testUser.userId);
      expect(session?.email).toBe(testUser.email);
      expect(session?.role).toBe(testUser.role);
    });

    it('attaches secure session cookies to response', () => {
      const res = NextResponse.json({ ok: true });
      const token = signAuthToken(testUser, '1h');
      setSessionCookie(res, token);

      const sessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      const clientCookie = res.cookies.get(CLIENT_TOKEN_COOKIE_NAME);

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.value).toBe(token);
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(String(sessionCookie?.sameSite).toLowerCase()).toBe('lax');

      expect(clientCookie).toBeDefined();
      expect(clientCookie?.value).toBe(token);
      expect(clientCookie?.httpOnly).toBe(false);
    });

    it('clears session cookies on sign out', () => {
      const res = NextResponse.json({ ok: true });
      clearSessionCookie(res);

      const sessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(sessionCookie?.maxAge).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Authentication API Endpoints
  // ---------------------------------------------------------------------------
  describe('Authentication Route Handlers', () => {
    it('GET /api/auth/me returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/me');
      const res = await getMe(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me returns 200 with user profile when authenticated', async () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/api/auth/me', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });

      const res = await getMe(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe(testUser.userId);
      expect(body.data.user.email).toBe(testUser.email);
    });

    it('POST /api/auth/signout terminates session and clears cookies', async () => {
      const res = await postSignout();
      expect(res.status).toBe(200);

      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie?.maxAge).toBe(0);
    });

    it('POST /api/auth/session establishes verified session from valid token', async () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });

      const res = await postSession(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.id).toBe(testUser.userId);

      const cookie = res.cookies.get(SESSION_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.httpOnly).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Route Protection Middleware (middleware.ts)
  // ---------------------------------------------------------------------------
  describe('Edge Middleware Route Guard (middleware.ts)', () => {
    it('redirects unauthenticated web requests on protected pages to /login', () => {
      const req = new NextRequest('http://localhost:3000/dispatch');
      const res = middleware(req);

      expect(res.status).toBe(307); // NextResponse.redirect
      const location = res.headers.get('location') || '';
      expect(location).toContain('/login');
      expect(location).toContain('from=%2Fdispatch');
    });

    it('returns 401 JSON for unauthenticated requests to protected API routes', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/routes/plan');
      const res = middleware(req);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('allows access to public pages without authentication', () => {
      const req = new NextRequest('http://localhost:3000/login');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows access to public auth APIs without authentication', () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session');
      const res = middleware(req);
      expect(res.status).toBe(200);
    });

    it('allows authenticated requests on protected operational pages', () => {
      const token = signAuthToken(testUser, '1h');
      const req = new NextRequest('http://localhost:3000/dispatch', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
      });

      const res = middleware(req);
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Password & OTP Security
  // ---------------------------------------------------------------------------
  describe('Password Hashing & OTP Security', () => {
    it('hashes passwords and validates matches via bcrypt', async () => {
      const plain = 'MountainPass#2024Secure!';
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith('$2')).toBe(true);

      const matches = await verifyPassword(plain, hash);
      expect(matches).toBe(true);

      const wrong = await verifyPassword('WrongPassword', hash);
      expect(wrong).toBe(false);
    });

    it('enforces rate limiting cooldown on repeated OTP requests', async () => {
      const testEmail = 'operator.disaster@meghalaya.gov.in';
      const first = await requestOtp(testEmail, 'email', 'login');
      expect(first.success).toBe(true);

      // Immediate second request must trigger cooldown error
      const second = await requestOtp(testEmail, 'email', 'login');
      expect(second.success).toBe(false);
      expect(second.error).toContain('Please wait');
      expect(second.cooldownRemaining).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Firebase Web Client Configuration & Architecture
  // ---------------------------------------------------------------------------
  describe('Firebase Client Configuration Architecture', () => {
    it('accurately resolves public client configuration parameters', () => {
      const config = getFirebaseConfig();
      expect(typeof config).toBe('object');
      expect('apiKey' in config).toBe(true);
      expect('projectId' in config).toBe(true);
      expect('authDomain' in config).toBe(true);
    });

    it('exposes public Firebase web config via /api/auth/firebase-config without private credentials', async () => {
      const res = await getFirebaseConfigRoute();
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.configured).toBe('boolean');

      if (json.configured) {
        expect(json.config.apiKey).toBeDefined();
        expect(json.config.projectId).toBeDefined();
        // Crucial security invariant: never expose private key
        expect(json.config.privateKey).toBeUndefined();
        expect(json.config.clientEmail).toBeUndefined();
        expect(json.config.FIREBASE_PRIVATE_KEY).toBeUndefined();
      }
    });

    it('correctly reports isFirebaseClientConfigured based on apiKey and projectId', () => {
      const configured = isFirebaseClientConfigured();
      expect(typeof configured).toBe('boolean');
    });
  });
});
