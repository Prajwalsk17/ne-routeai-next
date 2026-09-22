import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/api/response';
import { retryNotification } from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const retried = await retryNotification(params.id, sessionUser);
    return apiSuccess(retried, { message: 'Notification retry initiated' });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retry notification';
    return apiError(msg, 'NOTIFICATION_RETRY_ERROR', 500);
  }
}
