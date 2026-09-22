import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { markAllNotificationsAsRead } from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const result = await markAllNotificationsAsRead(sessionUser);
    return apiSuccess(result, { message: 'All notifications marked as read' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update notifications';
    return apiError(msg, 'NOTIFICATION_UPDATE_ERROR', 500);
  }
}
