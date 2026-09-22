import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { apiSuccess, apiUnauthorized } from '@/lib/api/response';

/**
 * GET /api/auth/me
 * Returns the profile of the currently authenticated user from session cookie or Bearer header
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await getSession(req);

  if (!user) {
    return apiUnauthorized('Authentication required. No valid session found.');
  }

  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId || null,
    },
    isAuthenticated: true,
  });
}
