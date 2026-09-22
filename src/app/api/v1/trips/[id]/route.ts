import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { tripUpdateSchema } from '@/lib/validation';
import { getTripById, updateTripRecord } from '@/lib/services/trip.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const trip = await getTripById(params.id, user);
    return apiSuccess(trip);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();
    const parsed = tripUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.actual_start !== undefined) updates.actualStart = parsed.data.actual_start;
    if (parsed.data.completed_at !== undefined) updates.completedAt = parsed.data.completed_at;
    if (parsed.data.vehicle_id) updates.vehicleId = parsed.data.vehicle_id;
    if (parsed.data.driver_id) updates.driverId = parsed.data.driver_id;

    const updated = await updateTripRecord(params.id, updates, user);
    return apiSuccess(updated, { message: 'Trip status updated successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
