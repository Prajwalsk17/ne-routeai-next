import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { shipmentCreateSchema, shipmentFilterSchema } from '@/lib/validation';
import { listShipments, createShipmentRecord } from '@/lib/services/shipment.service';
import { createShipment as legacyCreateShipment } from '@/lib/services/dispatch.service';
import { requirePermission } from '@/lib/auth/authorization';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const parsedFilter = shipmentFilterSchema.safeParse(queryObj);
    if (!parsedFilter.success) {
      return apiValidationError(parsedFilter.error);
    }

    const { shipments, total } = await listShipments(parsedFilter.data, user);
    return apiSuccess(shipments, { count: shipments.length, total });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:create');
    const body = await request.json();
    const parsed = shipmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const originFacility = parsed.data.origin_facility_id || parsed.data.origin_id!;
    const destFacility = parsed.data.destination_facility_id || parsed.data.destination_id!;
    const cargoClass = parsed.data.cargo_classification || parsed.data.cargo_type || 'GENERAL_FREIGHT';
    const weight = parsed.data.total_weight_kg || parsed.data.cargo_weight_kg || 500;
    const volume = parsed.data.total_volume_m3 || parsed.data.cargo_volume_m3 || 1.5;

    const shipment = await createShipmentRecord(
      {
        originFacilityId: originFacility,
        destinationFacilityId: destFacility,
        cargoClassification: cargoClass,
        priority: parsed.data.priority,
        totalWeightKg: weight,
        totalVolumeM3: volume,
        requiresColdChain: parsed.data.requires_cold_chain,
        minTemperatureC: parsed.data.min_temperature_c,
        maxTemperatureC: parsed.data.max_temperature_c,
        scheduledDeparture: parsed.data.scheduled_departure,
        notes: parsed.data.notes,
        items: parsed.data.items?.map((item) => ({
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitWeightKg: item.unit_weight_kg,
          unitVolumeM3: item.unit_volume_m3,
          isFragile: item.is_fragile,
          isHazardous: item.is_hazardous,
        })),
      },
      user
    );

    // Keep legacy dispatch service store in sync for existing scenarios
    try {
      await legacyCreateShipment({
        originId: originFacility,
        destinationId: destFacility,
        cargoType: cargoClass,
        cargoWeightKg: weight,
        cargoVolumeM3: volume,
        priority: parsed.data.priority,
        notes: parsed.data.notes,
        userId: user.id,
      });
    } catch {
      // Ignored
    }

    return apiSuccess(shipment, { message: 'Shipment consignment created successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
