/**
 * AuraNER / NER-Route AI — Production-Grade Token Verification Engine
 * 
 * Supports:
 * 1. Firebase Authentication ID Tokens (RS256 verified against Google JWKS / x509 public certificates).
 * 2. Cryptographic JWT Session Tokens (HS256 with strict signature and expiration checks).
 * 
 * Never bypasses authentication. Strictly rejects expired, malformed, or untrusted tokens.
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { normalizeRole } from '@/lib/auth/roles';

export class AuthError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(message: string, code = 'AUTH_ERROR', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

export class TokenExpiredError extends AuthError {
  constructor(message = 'Session has expired. Please sign in again.') {
    super(message, 'TOKEN_EXPIRED', 401);
  }
}

export class InvalidTokenError extends AuthError {
  constructor(message = 'Invalid authentication token.') {
    super(message, 'INVALID_TOKEN', 401);
  }
}

export interface VerifiedTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string | null;
  authTime?: number;
  exp: number;
  issuer: string;
}

// In-memory cache for Google's public x509 certificates
interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let _googleCertCache: CertCache | null = null;
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/**
 * Fetches and caches Google's public x509 certificates for Firebase ID Token verification
 */
async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (_googleCertCache && _googleCertCache.expiresAt > now) {
    return _googleCertCache.certs;
  }

  try {
    const res = await fetch(GOOGLE_CERTS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) {
      throw new Error(`Failed to fetch Google certs: HTTP ${res.status}`);
    }

    // Cache-Control max-age inspection
    let maxAgeSeconds = 3600;
    const cacheControl = res.headers.get('cache-control');
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) maxAgeSeconds = parseInt(match[1], 10);
    }

    const certs = (await res.json()) as Record<string, string>;
    _googleCertCache = {
      certs,
      expiresAt: now + maxAgeSeconds * 1000,
    };
    return certs;
  } catch (err) {
    logger.warn('Unable to refresh Google public x509 certs, using fallback verification', {
      error: (err as Error).message,
    });
    return _googleCertCache?.certs || {};
  }
}

/**
 * Verifies a Firebase Authentication ID Token against Google's public keys
 */
async function verifyFirebaseToken(token: string, projectId: string): Promise<VerifiedTokenPayload> {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header.kid) {
    throw new InvalidTokenError('Malformed Firebase token header.');
  }

  const kid = decodedHeader.header.kid;
  const certs = await getGooglePublicCerts();
  const cert = certs[kid];

  if (!cert) {
    throw new InvalidTokenError(`Unknown or expired Google signing key (${kid}).`);
  }

  try {
    const payload = jwt.verify(token, cert, {
      algorithms: ['RS256'],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    }) as JwtPayload;

    const email = (payload.email as string) || (payload.phone_number as string) || '';
    const name =
      (payload.name as string) ||
      (payload.phone_number as string) ||
      (email.includes('@') ? email.split('@')[0] : 'Authenticated User');
    const role = normalizeRole((payload.role as string) || (payload.role_code as string) || 'DISPATCHER');

    return {
      userId: payload.sub as string,
      email,
      name,
      role,
      organizationId: (payload.organization_id as string) || null,
      authTime: payload.auth_time ? Number(payload.auth_time) : undefined,
      exp: payload.exp as number,
      issuer: payload.iss as string,
    };
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError(err instanceof Error ? err.message : 'Invalid Firebase token signature.');
  }
}

/**
 * Primary token verification function.
 * Automatically identifies Firebase ID tokens vs HMAC JWT tokens and verifies them strictly.
 */
export async function verifyAuthToken(token: string): Promise<VerifiedTokenPayload> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new InvalidTokenError('Empty or missing token.');
  }

  const cleanToken = token.trim();
  const env = getEnv();
  const canonicalProjectId = 'ne-routeai-next';
  const configuredProjectId = env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const targetProjectId =
    configuredProjectId && configuredProjectId !== 'auraner-dev-local'
      ? configuredProjectId
      : canonicalProjectId;

  // Inspect unverified payload to detect token type
  let unverified: { header: jwt.JwtHeader; payload: jwt.JwtPayload | string } | null = null;
  try {
    unverified = jwt.decode(cleanToken, { complete: true }) as any;
  } catch {
    throw new InvalidTokenError('Malformed JWT structure.');
  }
  if (!unverified || typeof unverified === 'string' || !unverified.header || !unverified.payload) {
    throw new InvalidTokenError('Malformed JWT structure.');
  }

  const { header, payload } = unverified;

  // Explicitly reject insecure 'none' algorithm attacks
  if (!header.alg || header.alg.toLowerCase() === 'none') {
    throw new InvalidTokenError('Insecure "none" algorithm token rejected.');
  }

  const isFirebaseToken =
    header.alg === 'RS256' &&
    typeof payload === 'object' &&
    payload !== null &&
    typeof payload.iss === 'string' &&
    payload.iss.startsWith('https://securetoken.google.com/');

  // 1. Verify Firebase ID Token if detected
  if (isFirebaseToken) {
    const tokenAud = (payload as JwtPayload).aud;
    if (tokenAud && typeof tokenAud === 'string' && tokenAud !== targetProjectId) {
      throw new InvalidTokenError(
        `Firebase token audience mismatch: expected "${targetProjectId}", received "${tokenAud}".`
      );
    }
    return verifyFirebaseToken(cleanToken, targetProjectId);
  }

  // 2. Cryptographic JWT Verification Fallback (HS256)
  const isProd = process.env.NODE_ENV === 'production' || env.APP_ENV === 'production';
  const defaultSecret = 'ner-routeai-secret-key-sih-2024-production';
  let secret = env.JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    if (isProd) {
      throw new AuthError('JWT_SECRET configuration missing in production environment.', 'CONFIG_ERROR', 500);
    }
    secret = defaultSecret;
  } else if (isProd && secret === defaultSecret) {
    throw new AuthError('Insecure default JWT_SECRET prohibited in production environment.', 'CONFIG_ERROR', 500);
  }

  try {
    const verified = jwt.verify(cleanToken, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    const userId = (verified.userId as string) || (verified.sub as string);
    if (!userId) {
      throw new InvalidTokenError('Token payload missing subject identifier.');
    }

    return {
      userId,
      email: (verified.email as string) || '',
      name: (verified.name as string) || 'User',
      role: normalizeRole((verified.role as string) || (verified.role_code as string) || 'DISPATCHER'),
      organizationId: (verified.organizationId as string) || null,
      authTime: verified.iat,
      exp: verified.exp as number,
      issuer: (verified.iss as string) || 'auraner-auth',
    };
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    }
    if (err instanceof AuthError) {
      throw err;
    }
    throw new InvalidTokenError(err instanceof Error ? err.message : 'Cryptographic signature mismatch.');
  }
}

/**
 * Creates a cryptographically signed JWT token for session management
 */
export function signAuthToken(
  payload: {
    userId?: string;
    id?: string;
    email: string;
    role: string;
    name: string;
    organizationId?: string | null;
  },
  expiresIn: string | number = '24h'
): string {
  const env = getEnv();
  const secret = env.JWT_SECRET || process.env.JWT_SECRET || 'ner-routeai-secret-key-sih-2024-production';
  const resolvedUserId = payload.userId || payload.id || 'usr_anonymous';

  return jwt.sign(
    {
      userId: resolvedUserId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      organizationId: payload.organizationId || null,
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: 'auraner-auth',
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
    }
  );
}
