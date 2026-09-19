import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { shipmentDispatchSchema } from '@/lib/validation';
import { dispatchShipment, listAllShipments } from '@/lib/services/dispatch.service';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicle_id');
    const driverId = searchParams.get('driver_id');

    let shipments = await listAllShipments();

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
    const msg = err instanceof Error ? err.message : 'Failed to retrieve dispatches';
    return apiError(msg, 'DISPATCH_FETCH_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = shipmentDispatchSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const sessionUser = await getSession(request);
    const { shipment_id, vehicle_id, driver_id, route_id } = parsed.data;

    const dispatchedShipment = await dispatchShipment({
      shipmentId: shipment_id,
      vehicleId: vehicle_id,
      driverId: driver_id,
      routeId: route_id,
      dispatcherId: sessionUser?.id || null,
    });

    return apiSuccess(
      dispatchedShipment,
      { message: 'Shipment dispatched successfully and driver notified' },
      200
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to dispatch shipment';
    return apiError(msg, 'DISPATCH_EXECUTION_ERROR', 500);
  }
}
