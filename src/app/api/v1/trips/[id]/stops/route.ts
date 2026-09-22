import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { tripStopCreateSchema } from '@/lib/validation';
import { getTripById, addTripStop } from '@/lib/services/trip.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const trip = await getTripById(params.id, user);
    return apiSuccess(trip.stops, { count: trip.stops.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();
    const parsed = tripStopCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const stop = await addTripStop(
      params.id,
      {
        facilityId: parsed.data.facility_id,
        stopOrder: parsed.data.stop_order,
        stopType: parsed.data.stop_type,
        plannedArrival: parsed.data.planned_arrival ?? null,
        notes: parsed.data.notes,
      },
      user
    );

    return apiSuccess(stop, { message: 'Trip stop added successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
