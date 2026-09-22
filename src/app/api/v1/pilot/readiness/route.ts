import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { evaluatePilotReadiness, listPilotCohorts } from '@/lib/services/pilot.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const report = await evaluatePilotReadiness();
    const cohorts = await listPilotCohorts();

    return apiSuccess({
      readiness: report,
      activeCohorts: cohorts,
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to evaluate pilot readiness';
    return apiError(msg, 'PILOT_READINESS_ERROR', 500);
  }
}
