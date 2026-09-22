import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { shipmentItemCreateSchema } from '@/lib/validation';
import { listShipmentItems, addShipmentItem } from '@/lib/services/shipment.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const items = await listShipmentItems(params.id, user);
    return apiSuccess(items, { count: items.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:update');
    const body = await request.json();
    const parsed = shipmentItemCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const item = await addShipmentItem(
      params.id,
      {
        sku: parsed.data.sku,
        description: parsed.data.description,
        quantity: parsed.data.quantity,
        unitWeightKg: parsed.data.unit_weight_kg,
        unitVolumeM3: parsed.data.unit_volume_m3,
        isFragile: parsed.data.is_fragile,
        isHazardous: parsed.data.is_hazardous,
      },
      user
    );

    return apiSuccess(item, { message: 'Manifest item added successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
