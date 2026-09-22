import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { createRiskEventSchema, riskEventQuerySchema } from '@/lib/validation';
import { listRiskEvents, createRiskEvent } from '@/lib/services/risk.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      category: searchParams.get('category') || undefined,
      severity: searchParams.get('severity') || undefined,
      status: searchParams.get('status') || undefined,
      state: searchParams.get('state') || undefined,
      corridor: searchParams.get('corridor') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = riskEventQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await listRiskEvents(parsed.data as any);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    const body = await request.json();

    const parsed = createRiskEventSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const event = await createRiskEvent(
      {
        eventCode: parsed.data.event_code,
        category: parsed.data.category,
        severity: parsed.data.severity,
        status: 'ACTIVE',
        title: parsed.data.title,
        description: parsed.data.description,
        coordinates: {
          lat: parsed.data.latitude,
          lng: parsed.data.longitude,
        },
        affectedRadiusMeters: parsed.data.affected_radius_meters,
        affectedCorridors: parsed.data.affected_corridors,
        state: parsed.data.state,
        confidence: parsed.data.confidence,
        sourceId: parsed.data.source_id || null,
        reportedAt: parsed.data.reported_at,
        resolvedAt: null,
        provenance: {
          sourceProvider: 'MANUAL_OR_DISASTER_PORTAL',
          sourceCode: parsed.data.source_id || 'DISASTER_ALERT',
        },
      },
      user.id
    );

    return apiSuccess(event, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
