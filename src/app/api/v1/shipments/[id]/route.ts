import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { shipmentUpdateSchema } from '@/lib/validation';
import { getShipmentById, updateShipmentRecord, cancelShipmentRecord } from '@/lib/services/shipment.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const shipment = await getShipmentById(params.id, user);
    return apiSuccess(shipment);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:update');
    const body = await request.json();
    const parsed = shipmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.priority) updates.priority = parsed.data.priority;
    if (parsed.data.scheduled_departure !== undefined) updates.scheduledDeparture = parsed.data.scheduled_departure;
    if (parsed.data.actual_departure !== undefined) updates.actualDeparture = parsed.data.actual_departure;
    if (parsed.data.delivered_at !== undefined) updates.deliveredAt = parsed.data.delivered_at;
    if (parsed.data.pod_signature_url !== undefined) updates.podSignatureUrl = parsed.data.pod_signature_url;
    if (parsed.data.pod_photo_url !== undefined) updates.podPhotoUrl = parsed.data.pod_photo_url;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

    const updated = await updateShipmentRecord(params.id, updates, user);
    return apiSuccess(updated, { message: 'Shipment updated successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:cancel');
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const result = await cancelShipmentRecord(params.id, user, reason);
    return apiSuccess(result, { message: 'Shipment cancelled successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
