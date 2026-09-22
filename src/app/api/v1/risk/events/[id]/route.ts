import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { updateRiskEventSchema } from '@/lib/validation';
import { getRiskEventById, updateRiskEvent, resolveRiskEvent } from '@/lib/services/risk.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'data:read');
    const event = await getRiskEventById(params.id);
    return apiSuccess(event);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    const body = await request.json();

    const parsed = updateRiskEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    if (parsed.data.status === 'RESOLVED') {
      const resolved = await resolveRiskEvent(params.id, parsed.data.description, user.id);
      return apiSuccess(resolved);
    }

    const updated = await updateRiskEvent(
      params.id,
      {
        status: parsed.data.status,
        severity: parsed.data.severity,
        title: parsed.data.title,
        description: parsed.data.description,
        affectedRadiusMeters: parsed.data.affected_radius_meters,
        resolvedAt: parsed.data.resolved_at,
      },
      user.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
