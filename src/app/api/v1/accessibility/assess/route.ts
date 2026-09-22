import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { assessAccessibilitySchema } from '@/lib/validation';
import { assessAccessibility } from '@/lib/services/accessibility.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:read');
    const body = await request.json();

    const parsed = assessAccessibilitySchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const input = {
      routeSegments: parsed.data.route_segments,
      location: parsed.data.location
        ? {
            id: parsed.data.location.id,
            name: parsed.data.location.name,
            coordinates: parsed.data.location.coordinates,
            elevationMeters: parsed.data.location.elevation_meters,
            state: parsed.data.location.state,
          }
        : undefined,
      facilityId: parsed.data.facility_id,
      vehicleSpecs: parsed.data.vehicle_specs
        ? {
            is4WD: parsed.data.vehicle_specs.is_4wd,
            grossWeightTonnes: parsed.data.vehicle_specs.gross_weight_tonnes,
            heightMeters: parsed.data.vehicle_specs.height_meters,
          }
        : undefined,
    };

    const assessment = await assessAccessibility(input, user.id);
    return apiSuccess(assessment);
  } catch (error) {
    return handleApiError(error);
  }
}
