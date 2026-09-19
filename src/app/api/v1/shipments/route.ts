import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { shipmentCreateSchema } from '@/lib/validation';
import { createShipment, listAllShipments } from '@/lib/services/dispatch.service';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let shipments = await listAllShipments();
    if (statusFilter) {
      shipments = shipments.filter((s) => s.status === statusFilter);
    }

    return apiSuccess(shipments, { count: shipments.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve shipments';
    return apiError(msg, 'SHIPMENT_FETCH_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shipmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const sessionUser = await getSession(request);
    const { origin_id, destination_id, cargo_type, cargo_weight_kg, cargo_volume_m3, priority, notes } = parsed.data;

    const shipment = await createShipment({
      originId: origin_id,
      destinationId: destination_id,
      cargoType: cargo_type,
      cargoWeightKg: cargo_weight_kg,
      cargoVolumeM3: cargo_volume_m3,
      priority,
      notes,
      userId: sessionUser?.id || null,
    });

    return apiSuccess(shipment, { message: 'Shipment created successfully' }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create shipment';
    return apiError(msg, 'SHIPMENT_CREATION_ERROR', 500);
  }
}
