import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { createPilotIncidentSchema } from '@/lib/validation';
import {
  createPilotIncident,
  listPilotIncidents,
} from '@/lib/services/pilot.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const severity = searchParams.get('severity') as any;

    const incidents = await listPilotIncidents({
      organizationId: sessionUser.organizationId || undefined,
      status,
      severity,
    });

    return apiSuccess(incidents, { count: incidents.length });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to query pilot incidents';
    return apiError(msg, 'PILOT_INCIDENT_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const body = await request.json();
    const parsed = createPilotIncidentSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const incident = await createPilotIncident(
      {
        title: parsed.data.title,
        description: parsed.data.description,
        severity: parsed.data.severity,
        category: parsed.data.category,
        affected_corridor: parsed.data.affected_corridor,
        affected_vehicle_id: parsed.data.affected_vehicle_id,
        affected_trip_id: parsed.data.affected_trip_id,
        assigned_to: parsed.data.assigned_to,
      },
      sessionUser
    );

    return apiSuccess(incident, undefined, 201);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to report pilot incident';
    return apiError(msg, 'PILOT_INCIDENT_CREATION_ERROR', 500);
  }
}
