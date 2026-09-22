import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { updatePilotIncidentSchema } from '@/lib/validation';
import {
  getPilotIncidentById,
  updatePilotIncidentStatus,
} from '@/lib/services/pilot.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const incident = await getPilotIncidentById(params.id);
    return apiSuccess(incident);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve pilot incident';
    return apiError(msg, 'PILOT_INCIDENT_NOT_FOUND', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = updatePilotIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const incident = await updatePilotIncidentStatus(
      params.id,
      parsed.data,
      sessionUser
    );

    return apiSuccess(incident);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) return apiError(err.message, err.code, err.status);
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to update pilot incident';
    return apiError(msg, 'PILOT_INCIDENT_UPDATE_ERROR', 500);
  }
}
