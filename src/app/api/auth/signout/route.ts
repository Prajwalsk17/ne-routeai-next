import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';
import { apiSuccess } from '@/lib/api/response';

/**
 * POST /api/auth/signout
 * Clears session cookies and terminates the active session
 */
export async function POST(): Promise<NextResponse> {
  const res = apiSuccess({
    message: 'Signed out successfully.',
    signedOut: true,
  });

  clearSessionCookie(res);

  return res;
}
