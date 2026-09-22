import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { tripAssignmentCreateSchema } from '@/lib/validation';
import { assignShipmentToTrip } from '@/lib/services/trip.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();
    const parsed = tripAssignmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const assignment = await assignShipmentToTrip(params.id, parsed.data.shipment_id, user);
    return apiSuccess(assignment, { message: 'Shipment assigned to trip successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
