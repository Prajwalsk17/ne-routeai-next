import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError, BadRequestError } from '@/lib/api/response';
import { notificationQuerySchema, sendNotificationSchema } from '@/lib/validation';
import { listNotifications, sendDirectNotification } from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = notificationQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { notifications, total } = await listNotifications(
      {
        recipientId: parsed.data.recipient_id,
        channel: parsed.data.channel,
        status: parsed.data.status,
        alertId: parsed.data.alert_id,
        unreadOnly: parsed.data.unread_only,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      },
      sessionUser
    );

    return apiSuccess(notifications, { count: total, limit: parsed.data.limit, offset: parsed.data.offset });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to query notifications';
    return apiError(msg, 'NOTIFICATION_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = sendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const notification = await sendDirectNotification(
      {
        recipientId: parsed.data.recipient_id,
        recipientType: parsed.data.recipient_type,
        channel: parsed.data.channel,
        destination: parsed.data.destination,
        title: parsed.data.title,
        body: parsed.data.body,
        priority: parsed.data.priority,
        alertId: parsed.data.alert_id,
        deduplicationKey: parsed.data.deduplication_key,
        metadata: parsed.data.metadata,
      },
      sessionUser
    );

    return apiSuccess(notification, { message: 'Notification queued and dispatched' }, 201);
  } catch (err: unknown) {
    if (err instanceof BadRequestError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to dispatch notification';
    return apiError(msg, 'NOTIFICATION_DISPATCH_ERROR', 500);
  }
}
