import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { createPilotFeedbackSchema } from '@/lib/validation';
import {
  submitPilotFeedback,
  listPilotFeedback,
  getPilotFeedbackSummary,
} from '@/lib/services/pilot.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as any;
    const role = searchParams.get('role') || undefined;
    const minRating = searchParams.get('minRating') ? parseInt(searchParams.get('minRating')!, 10) : undefined;
    const includeSummary = searchParams.get('summary') === 'true';

    const feedback = await listPilotFeedback({
      organizationId: sessionUser.organizationId || undefined,
      category,
      role,
      minRating,
    });

    let summary = undefined;
    if (includeSummary) {
      summary = await getPilotFeedbackSummary(sessionUser.organizationId || undefined);
    }

    return apiSuccess({
      feedback,
      summary,
    }, { count: feedback.length });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve pilot feedback';
    return apiError(msg, 'PILOT_FEEDBACK_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = createPilotFeedbackSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const feedback = await submitPilotFeedback(
      {
        category: parsed.data.category,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        trip_id: parsed.data.trip_id,
        vehicle_id: parsed.data.vehicle_id,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        metadata: parsed.data.metadata,
      },
      sessionUser
    );

    return apiSuccess(feedback, undefined, 201);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to submit pilot feedback';
    return apiError(msg, 'PILOT_FEEDBACK_SUBMISSION_ERROR', 500);
  }
}
