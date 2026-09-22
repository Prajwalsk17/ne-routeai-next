import { describe, it, expect } from 'vitest';
import { validateEnv, serverEnvSchema } from '@/lib/env';
import { sanitizeContext, Logger } from '@/lib/logger';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  handleApiError,
  apiSuccess,
  apiError,
} from '@/lib/api/response';

describe('Phase 3: Infrastructure Foundation Verification', () => {
  describe('Environment Variable Validation (src/lib/env.ts)', () => {
    it('validates a standard development environment configuration', () => {
      const result = validateEnv({
        APP_ENV: 'development',
        ALLOW_MOCK_PROVIDERS: 'true',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      });

      expect(result.success).toBe(true);
      expect(result.data?.APP_ENV).toBe('development');
      expect(result.data?.ALLOW_MOCK_PROVIDERS).toBe(true);
    });

    it('rejects production environment if mock providers are enabled', () => {
      const result = validateEnv({
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: 'true',
        NEXT_PUBLIC_APP_URL: 'https://ne-routeai.in',
      });

      expect(result.success).toBe(false);
      const formatted = result.errors;
      expect(formatted?.ALLOW_MOCK_PROVIDERS?._errors).toContain(
        'ALLOW_MOCK_PROVIDERS must not be enabled in production environment.'
      );
    });

    it('rejects production environment if public URL is not HTTPS', () => {
      const result = validateEnv({
        APP_ENV: 'production',
        ALLOW_MOCK_PROVIDERS: 'false',
        NEXT_PUBLIC_APP_URL: 'http://insecure-domain.in',
      });

      expect(result.success).toBe(false);
      const formatted = result.errors;
      expect(formatted?.NEXT_PUBLIC_APP_URL?._errors).toContain(
        'NEXT_PUBLIC_APP_URL must use secure HTTPS in production environment.'
      );
    });
  });

  describe('Structured Logger & PII Sanitization (src/lib/logger.ts)', () => {
    it('recursively redacts passwords, tokens, secrets, and phone numbers', () => {
      const rawPayload = {
        userId: 'usr-123',
        password: 'superSecretPassword123',
        apiKey: 'sk_live_9949219',
        nested: {
          authToken: 'Bearer secret-jwt-token',
          driverPhone: '+91-9876543210',
          cleanMetadata: 'Normal operational context',
        },
      };

      const sanitized = sanitizeContext(rawPayload) as any;

      expect(sanitized.userId).toBe('usr-123');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.authToken).toBe('[REDACTED]');
      expect(sanitized.nested.driverPhone).toBe('[REDACTED]');
      expect(sanitized.nested.cleanMetadata).toBe('Normal operational context');
    });

    it('creates child logger with bound correlation IDs', () => {
      const parentLogger = new Logger({ service: 'test-service' });
      const childLogger = parentLogger.withContext({
        requestId: 'req-abc-123',
        traceId: 'trace-xyz-789',
      });

      expect(childLogger).toBeInstanceOf(Logger);
    });
  });

  describe('Standardized API Responses & AppError Hierarchy (src/lib/api/response.ts)', () => {
    it('correctly instantiates typed AppError classes with expected status codes', () => {
      const valErr = new ValidationError('Invalid cargo weight', { min: 1 });
      expect(valErr.code).toBe('VALIDATION_ERROR');
      expect(valErr.status).toBe(400);
      expect(valErr.details).toEqual({ min: 1 });

      const notFoundErr = new NotFoundError('Vehicle not found');
      expect(notFoundErr.code).toBe('NOT_FOUND');
      expect(notFoundErr.status).toBe(404);

      const unauthErr = new UnauthorizedError();
      expect(unauthErr.code).toBe('UNAUTHORIZED');
      expect(unauthErr.status).toBe(401);
    });

    it('formats handled AppError into standard ApiResponse JSON with correlation ID', async () => {
      const err = new ValidationError('Cargo weight must be positive');
      const response = handleApiError(err, 'req-uuid-999');

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toBe('Cargo weight must be positive');
      expect(json.error.requestId).toBe('req-uuid-999');
      expect(json.meta.requestId).toBe('req-uuid-999');
    });

    it('formats successful responses with metadata and timestamp', async () => {
      const response = apiSuccess({ vehicleCount: 42 }, { requestId: 'req-success-1' });
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.vehicleCount).toBe(42);
      expect(json.meta.requestId).toBe('req-success-1');
      expect(json.meta.timestamp).toBeDefined();
    });
  });
});
