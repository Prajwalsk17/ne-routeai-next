import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/api/response';
import { getAlertById } from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const alert = await getAlertById(params.id, sessionUser);
    return apiSuccess(alert);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve alert';
    return apiError(msg, 'ALERT_RETRIEVAL_ERROR', 500);
  }
}
