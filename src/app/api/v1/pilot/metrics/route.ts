import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { getPilotOperationalHealth } from '@/lib/services/pilot.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const metrics = getPilotOperationalHealth();
    return apiSuccess(metrics);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve pilot operational metrics';
    return apiError(msg, 'PILOT_METRICS_ERROR', 500);
  }
}
