import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/api/response';
import { acknowledgeAlert } from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';
import { z } from 'zod';

const acknowledgeActionSchema = z.object({
  action: z.enum(['ACKNOWLEDGE', 'ESCALATE', 'RESOLVE', 'DISMISS']).default('ACKNOWLEDGE'),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = acknowledgeActionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const updated = await acknowledgeAlert(
      {
        alertId: params.id,
        action: parsed.data.action,
        notes: parsed.data.notes,
      },
      sessionUser
    );

    return apiSuccess(updated, {
      message: `Alert successfully updated with action: ${parsed.data.action}`,
    });
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to acknowledge alert';
    return apiError(msg, 'ALERT_ACKNOWLEDGE_ERROR', 500);
  }
}
