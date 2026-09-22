import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { tripCreateSchema, tripFilterSchema } from '@/lib/validation';
import { listTrips, createTripRecord } from '@/lib/services/trip.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:read');
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const parsedFilter = tripFilterSchema.safeParse(queryObj);
    if (!parsedFilter.success) {
      return apiValidationError(parsedFilter.error);
    }

    const { trips, total } = await listTrips(parsedFilter.data, user);
    return apiSuccess(trips, { count: trips.length, total });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json();
    const parsed = tripCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const trip = await createTripRecord(
      {
        vehicleId: parsed.data.vehicle_id,
        driverId: parsed.data.driver_id,
        routeVersionId: parsed.data.route_version_id ?? null,
        scheduledStart: parsed.data.scheduled_start,
        stops: parsed.data.stops?.map((s) => ({
          facilityId: s.facility_id,
          stopOrder: s.stop_order,
          stopType: s.stop_type,
          plannedArrival: s.planned_arrival ?? null,
          notes: s.notes,
        })),
        shipmentIds: parsed.data.shipment_ids,
      },
      user
    );

    return apiSuccess(trip, { message: 'Trip itinerary and assignments dispatched successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
