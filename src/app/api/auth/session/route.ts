import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, signAuthToken, AuthError } from '@/lib/auth/token-verifier';
import { normalizeRole } from '@/lib/auth/roles';
import { setSessionCookie } from '@/lib/auth/session';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api/response';

/**
 * POST /api/auth/session
 * Establishes a verified server-side session from a client ID token (Firebase or cryptographic JWT)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return apiError('Malformed JSON payload', 'INVALID_REQUEST', 400);
  }

  const idToken = (body.idToken as string || body.token as string || '').trim();
  if (!idToken) {
    return apiError('idToken is required to establish a session.', 'VALIDATION_ERROR', 400);
  }

  try {
    const verified = await verifyAuthToken(idToken);

    // Authoritative identity derived strictly from verified token
    const userId = verified.userId;
    const email = verified.email;

    // Resolve name: prefer token claims, fallback to registration display name, then email prefix
    const clientName = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined;
    const resolvedName = verified.name && verified.name !== 'Authenticated User'
      ? verified.name
      : clientName || (email.includes('@') ? email.split('@')[0] : 'Operator');

    // Authoritative role resolution: NEVER blindly trust unverified client-supplied role
    let resolvedRole = verified.role;
    if (!resolvedRole || resolvedRole === 'VIEWER') {
      // If signup registration requested a valid operational role (cannot self-grant SUPER_ADMIN)
      if (typeof body.role === 'string' && body.role.trim()) {
        const requested = normalizeRole(body.role);
        resolvedRole = requested === 'SUPER_ADMIN' ? 'DISPATCHER' : requested;
      } else {
        resolvedRole = email.toLowerCase().includes('admin') ? 'ORG_ADMIN' : 'DISPATCHER';
      }
    }

    // Authoritative organization resolution: token claims > email domain mapping > default tenant
    let resolvedOrgId = verified.organizationId || null;
    if (!resolvedOrgId) {
      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes('meghalaya')) {
        resolvedOrgId = 'org_meghalaya_disaster';
      } else if (lowerEmail.includes('nagaland')) {
        resolvedOrgId = 'org_nagaland_relief';
      } else if (lowerEmail.includes('tripura')) {
        resolvedOrgId = 'org_tripura_health';
      } else if (lowerEmail.includes('mizoram')) {
        resolvedOrgId = 'org_mizoram_logistics';
      } else if (typeof body.organizationId === 'string' && body.organizationId.trim()) {
        // Accept organization on new signup if valid known tenant
        const validOrgIds = [
          'org_assam_civil_supplies',
          'org_meghalaya_disaster',
          'org_nagaland_relief',
          'org_tripura_health',
          'org_mizoram_logistics',
        ];
        resolvedOrgId = validOrgIds.includes(body.organizationId.trim())
          ? body.organizationId.trim()
          : 'org_assam_civil_supplies';
      } else {
        resolvedOrgId = 'org_assam_civil_supplies';
      }
    }

    // Create session token to persist across HTTP requests
    const sessionToken = signAuthToken({
      userId,
      email,
      role: resolvedRole,
      name: resolvedName,
      organizationId: resolvedOrgId,
    });

    const res = apiSuccess({
      user: {
        id: verified.userId,
        email: verified.email,
        name: resolvedName,
        role: resolvedRole,
        organizationId: resolvedOrgId,
      },
      token: sessionToken,
      expiresAt: verified.exp,
    });

    // Set secure HTTP-only cookies
    setSessionCookie(res, sessionToken);

    return res;
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return apiUnauthorized(err.message);
    }
    return apiUnauthorized('Authentication failed. Invalid token signature or token expired.');
  }
}
