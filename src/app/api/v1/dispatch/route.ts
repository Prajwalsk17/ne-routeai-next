import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { shipmentDispatchSchema } from '@/lib/validation';
import { dispatchShipment, listAllShipments } from '@/lib/services/dispatch.service';
import { requirePermission } from '@/lib/auth/authorization';
import { filterByTenant } from '@/lib/db/tenant-scope';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');
    const driverId = searchParams.get('driver_id');

    let shipments = await listAllShipments();

    // Enforce tenant isolation on returned records
    shipments = filterByTenant(shipments, user);

    // Default to active dispatches (DISPATCHED or IN_TRANSIT) unless status query specified
    const status = searchParams.get('status');
    if (status) {
      shipments = shipments.filter((s) => s.status === status);
    } else {
      shipments = shipments.filter(
        (s) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT'
      );
    }

    if (vehicleId) {
      shipments = shipments.filter((s) => s.assignedVehicleId === vehicleId);
    }
    if (driverId) {
      shipments = shipments.filter((s) => s.assignedDriverId === driverId);
    }

    return apiSuccess(shipments, { count: shipments.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();
    const parsed = shipmentDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { shipment_id, vehicle_id, driver_id, route_id } = parsed.data;

    const dispatchedShipment = await dispatchShipment({
      shipmentId: shipment_id,
      vehicleId: vehicle_id,
      driverId: driver_id,
      routeId: route_id,
      dispatcherId: user.id,
    });

    return apiSuccess(
      dispatchedShipment,
      { message: 'Shipment successfully dispatched and driver notified' }
    );
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
