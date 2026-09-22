/**
 * AuraNER / NER-Route AI — Phase 22: Security Hardening Test Suite
 * 
 * Verifies:
 * 1. Authentication & Token Attack Paths ('none' algorithm, signature mismatch, expiration)
 * 2. Authorization & Tenant Isolation IDOR Defenses
 * 3. Rate Limiting Tiers & Sliding-Window Enforcement
 * 4. Production Security Headers, CORS, and CSRF Protection
 * 5. Input Validation, Path Traversal & Document Upload Security
 * 6. Information Disclosure, Sensitive Log Redaction & Production Invariants
 */

import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import {
  verifyAuthToken,
  signAuthToken,
  InvalidTokenError,
  TokenExpiredError,
} from '@/lib/auth/token-verifier';
import { normalizeRole, hasPermission } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import {
  checkRateLimit,
  _resetRateLimiterStore,
  getClientIp,
} from '@/lib/security/rate-limiter';
import {
  getProductionSecurityHeaders,
  isAllowedOrigin,
  getCorsHeaders,
  validateCsrfOrigin,
} from '@/lib/security/headers';
import {
  sanitizeFilename,
  validateDocumentUpload,
  validateStorageUrl,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from '@/lib/security/file-security';
import { sanitizeContext } from '@/lib/logger';
import { createVehicle, getVehicleById, _resetFleetStore } from '@/lib/services/fleet.service';
import { createTripRecord, getTripById, _resetTripStore } from '@/lib/services/trip.service';
import { createDriver, _resetDriverStore } from '@/lib/services/driver.service';
import { ForbiddenError } from '@/lib/api/response';
import { middleware } from '@/middleware';

// Test Actors
const userAssam: SessionUser = {
  id: 'usr_assam_01',
  email: 'dispatcher@assam.gov.in',
  name: 'Assam Dispatcher',
  role: 'DISPATCHER',
  organizationId: 'org_assam',
};

const userNagaland: SessionUser = {
  id: 'usr_nagaland_01',
  email: 'dispatcher@nagaland.gov.in',
  name: 'Nagaland Dispatcher',
  role: 'DISPATCHER',
  organizationId: 'org_nagaland',
};

const viewerAssam: SessionUser = {
  id: 'usr_viewer_01',
  email: 'viewer@assam.gov.in',
  name: 'Assam Public Observer',
  role: 'VIEWER',
  organizationId: 'org_assam',
};

describe('Phase 22: Security Hardening Architecture', () => {
  beforeEach(() => {
    _resetRateLimiterStore();
    _resetFleetStore();
    _resetTripStore();
    _resetDriverStore();
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication & Token Attack Paths
  // ---------------------------------------------------------------------------
  describe('Authentication & Token Attack Paths', () => {
    it('rejects tokens forged with the insecure "none" algorithm', async () => {
      // Craft an unverified token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          userId: 'usr_hacker',
          email: 'hacker@evil.com',
          role: 'SUPER_ADMIN',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      const forgedToken = `${header}.${payload}.`;

      await expect(verifyAuthToken(forgedToken)).rejects.toThrow(InvalidTokenError);
      await expect(verifyAuthToken(forgedToken)).rejects.toThrow(/none/i);
    });

    it('rejects tokens with signature mismatches or forged signing keys', async () => {
      const forgedToken = jwt.sign(
        { userId: 'usr_victim', role: 'SUPER_ADMIN', email: 'admin@gov.in' },
        'attacker-secret-key',
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      await expect(verifyAuthToken(forgedToken)).rejects.toThrow(InvalidTokenError);
    });

    it('rejects expired session tokens', async () => {
      const expiredToken = signAuthToken(userAssam, '-10s');
      await expect(verifyAuthToken(expiredToken)).rejects.toThrow(TokenExpiredError);
    });

    it('rejects malformed, empty, or garbage tokens', async () => {
      await expect(verifyAuthToken('')).rejects.toThrow(InvalidTokenError);
      await expect(verifyAuthToken('not-a-jwt')).rejects.toThrow(InvalidTokenError);
      await expect(verifyAuthToken('a.b')).rejects.toThrow(InvalidTokenError);
    });

    it('successfully verifies genuine HMAC-signed tokens with expected claims', async () => {
      const validToken = signAuthToken(userAssam, '2h');
      const verified = await verifyAuthToken(validToken);

      expect(verified.userId).toBe(userAssam.id);
      expect(verified.email).toBe(userAssam.email);
      expect(verified.organizationId).toBe(userAssam.organizationId);
      expect(verified.role).toBe('DISPATCHER');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Authorization & Multi-Tenant IDOR Defenses
  // ---------------------------------------------------------------------------
  describe('Authorization & Multi-Tenant IDOR Defenses', () => {
    it('prevents cross-tenant entity access via assertTenantOwnership', () => {
      expect(() => {
        assertTenantOwnership('org_nagaland', userAssam, 'trip');
      }).toThrow(ForbiddenError);

      expect(() => {
        assertTenantOwnership('org_assam', userAssam, 'trip');
      }).not.toThrow();
    });

    it('prevents Org A from accessing or mutating Org B fleet vehicles', async () => {
      const assamVehicle = await createVehicle(
        {
          registrationNumber: 'AS-01-SEC-001',
          makeModel: 'Tata Xenon 4WD',
          type: 'UTILITY_4X4',
          payloadCapacityKg: 2000,
          cargoVolumeM3: 6.0,
          maxGradientPct: 35,
          maxWidthMeters: 2.1,
          waterCrossingDepthMm: 650,
          hasColdChain: true,
          fuelType: 'DIESEL',
          fuelCapacityLiters: 80,
          currentFuelPct: 90,
          facilityId: null,
          currentLocation: null,
          assignedDriverId: null,
          lastTelemetryAt: null,
          status: 'AVAILABLE',
        },
        userAssam
      );

      // Nagaland user attempting to read Assam vehicle
      await expect(getVehicleById(assamVehicle.id, userNagaland)).rejects.toThrow(ForbiddenError);
    });

    it('enforces RBAC capability boundaries: VIEWER cannot dispatch or manage fleet', () => {
      expect(hasPermission('VIEWER', 'shipments:create')).toBe(false);
      expect(hasPermission('VIEWER', 'shipments:dispatch')).toBe(false);
      expect(hasPermission('VIEWER', 'fleet:manage')).toBe(false);
      expect(hasPermission('VIEWER', 'routes:calculate')).toBe(false);
      expect(hasPermission('VIEWER', 'shipments:read')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Rate Limiting Defenses
  // ---------------------------------------------------------------------------
  describe('Rate Limiting & Abuse Prevention', () => {
    it('blocks rapid authentication attempts exceeding the AUTH tier quota (5 req/min)', () => {
      const ip = '198.51.100.42';

      // 5 requests allowed
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(ip, 'AUTH');
        expect(result.allowed).toBe(true);
      }

      // 6th request blocked with 429 semantics
      const blocked = checkRateLimit(ip, 'AUTH');
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('isolates rate limits between distinct client identifiers', () => {
      const attackerIp = '203.0.113.1';
      const benignIp = '203.0.113.2';

      // Attacker exhausts quota
      for (let i = 0; i < 5; i++) {
        checkRateLimit(attackerIp, 'AUTH');
      }
      expect(checkRateLimit(attackerIp, 'AUTH').allowed).toBe(false);

      // Benign user is unaffected
      expect(checkRateLimit(benignIp, 'AUTH').allowed).toBe(true);
    });

    it('extracts IP addresses reliably from x-forwarded-for headers', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.195, 10.0.0.1');
      expect(getClientIp(headers)).toBe('203.0.113.195');

      const headersSingle = new Headers();
      headersSingle.set('x-real-ip', '198.51.100.7');
      expect(getClientIp(headersSingle)).toBe('198.51.100.7');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Production Security Headers, CORS, and CSRF Protection
  // ---------------------------------------------------------------------------
  describe('Security Headers, CORS & CSRF Defenses', () => {
    it('generates hardened production security headers (HSTS, CSP, X-Frame-Options: DENY)', () => {
      const headers = getProductionSecurityHeaders({ isProduction: true });

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    });

    it('validates allowed origins and rejects untrusted external origins', () => {
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
      expect(isAllowedOrigin('https://malicious-phishing-portal.com')).toBe(false);
      expect(isAllowedOrigin('http://evil.org')).toBe(false);
    });

    it('generates CORS headers reflecting allowed origin and rejects wildcard with credentials', () => {
      const trustedCors = getCorsHeaders('http://localhost:3000');
      expect(trustedCors['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(trustedCors['Access-Control-Allow-Credentials']).toBe('true');

      const untrustedCors = getCorsHeaders('https://attacker.com');
      expect(untrustedCors['Access-Control-Allow-Origin']).toBe('');
    });

    it('validates CSRF origin on mutating state requests (POST, PUT, DELETE)', () => {
      const headers = new Headers();
      headers.set('origin', 'https://attacker.com');

      const check = validateCsrfOrigin('POST', headers, 'http://localhost:3000/api/v1/shipments');
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('Untrusted Origin');
    });

    it('permits mutating state requests from trusted same-origin or Bearer auth', () => {
      const headers = new Headers();
      headers.set('origin', 'http://localhost:3000');
      const checkOrigin = validateCsrfOrigin('POST', headers, 'http://localhost:3000/api/v1/shipments');
      expect(checkOrigin.valid).toBe(true);

      const bearerHeaders = new Headers();
      bearerHeaders.set('authorization', 'Bearer some-valid-token');
      const checkBearer = validateCsrfOrigin('POST', bearerHeaders, 'http://localhost:3000/api/v1/shipments');
      expect(checkBearer.valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Input Validation, Path Traversal & Document Upload Security
  // ---------------------------------------------------------------------------
  describe('Input Validation & Document Security', () => {
    it('sanitizes filenames stripping directory traversal and null byte injections', () => {
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
      expect(sanitizeFilename('malicious\0file.pdf')).toBe('maliciousfile.pdf');
      expect(sanitizeFilename('normal_insurance_rc.pdf')).toBe('normal_insurance_rc.pdf');
    });

    it('rejects dangerous document upload MIME types and oversized files', () => {
      // Disallowed executable script
      const phpUpload = validateDocumentUpload({
        name: 'shell.php',
        size: 1024,
        mimeType: 'application/x-php',
      });
      expect(phpUpload.valid).toBe(false);
      expect(phpUpload.error).toContain('Disallowed MIME type');

      // Oversized file (>10MB)
      const oversized = validateDocumentUpload({
        name: 'huge_scan.pdf',
        size: MAX_UPLOAD_FILE_SIZE_BYTES + 1024,
        mimeType: 'application/pdf',
      });
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain('exceeds the 10MB limit');

      // Valid PDF document
      const validPdf = validateDocumentUpload({
        name: 'vehicle_fitness_cert.pdf',
        size: 500 * 1024,
        mimeType: 'application/pdf',
      });
      expect(validPdf.valid).toBe(true);
    });

    it('rejects malicious pseudo-protocols in document storage URLs', () => {
      expect(validateStorageUrl('javascript:alert(1)').valid).toBe(false);
      expect(validateStorageUrl('data:text/html,<script>alert(1)</script>').valid).toBe(false);
      expect(validateStorageUrl('file:///etc/shadow').valid).toBe(false);
      expect(validateStorageUrl('https://vault.auraner.gov.in/docs/fitness-2026.pdf').valid).toBe(true);
      expect(validateStorageUrl('auraner-vault://documents/driver-license-88.pdf').valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Information Disclosure, Sensitive Log Redaction & Production Invariants
  // ---------------------------------------------------------------------------
  describe('Information Disclosure & Sensitive Data Redaction', () => {
    it('recursively redacts credentials, tokens, OTPs, PINs, and personal IDs in logger', () => {
      const payload = {
        userId: 'usr_123',
        password: 'superSecretPassword123',
        token: 'eyJhbGciOiJIUzI1NiJ9.demo',
        otpCode: '882194',
        pin: '1234',
        userLicense: 'AS-01-2024-88',
        aadhaarNumber: '9988-7766-5544',
        safeMetadata: {
          tripId: 'trip-9901',
          cargoWeightKg: 1500,
        },
      };

      const sanitized = sanitizeContext(payload) as Record<string, any>;

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.otpCode).toBe('[REDACTED]');
      expect(sanitized.pin).toBe('[REDACTED]');
      expect(sanitized.userLicense).toBe('[REDACTED]');
      expect(sanitized.aadhaarNumber).toBe('[REDACTED]');
      expect(sanitized.safeMetadata.tripId).toBe('trip-9901');
      expect(sanitized.safeMetadata.cargoWeightKg).toBe(1500);
    });

    it('redacts sensitive query parameters embedded in logged URLs', () => {
      const loggedUrl = 'https://ne-routeai.in/api/v1/auth/callback?token=eyJhbGciOiJIUzI1NiJ9&code=482103&state=ok';
      const sanitized = sanitizeContext(loggedUrl) as string;

      expect(sanitized).toContain('token=[REDACTED]');
      expect(sanitized).toContain('code=[REDACTED]');
      expect(sanitized).toContain('state=ok');
    });

    it('middleware attaches production security headers and denies unauthenticated API requests', async () => {
      const req = new NextRequest(new URL('/api/v1/trips', 'http://localhost:3000'), {
        method: 'GET',
      });

      const res = middleware(req);
      expect(res.status).toBe(401);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });
});
