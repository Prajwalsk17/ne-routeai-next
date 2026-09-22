import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { vehicleCreateSchema, vehicleFilterSchema } from '@/lib/validation';
import { listVehicles, createVehicle } from '@/lib/services/fleet.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'fleet:read');
    const { searchParams } = new URL(request.url);

    const queryObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryObj[key] = val;
    });

    const parsedFilter = vehicleFilterSchema.safeParse(queryObj);
    if (!parsedFilter.success) {
      return apiValidationError(parsedFilter.error);
    }

    const { vehicles, total } = await listVehicles(parsedFilter.data, user);
    return apiSuccess(vehicles, {
      count: vehicles.length,
      total,
      limit: parsedFilter.data.limit,
      offset: parsedFilter.data.offset,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'fleet:manage');
    const body = await request.json();
    const parsed = vehicleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const vehicle = await createVehicle(
      {
        registrationNumber: parsed.data.registration_number,
        makeModel: parsed.data.make_model,
        type: parsed.data.type,
        payloadCapacityKg: parsed.data.payload_capacity_kg,
        cargoVolumeM3: parsed.data.cargo_volume_m3,
        maxGradientPct: parsed.data.max_gradient_pct,
        maxWidthMeters: parsed.data.max_width_meters,
        waterCrossingDepthMm: parsed.data.water_crossing_depth_mm,
        hasColdChain: parsed.data.has_cold_chain,
        fuelType: parsed.data.fuel_type,
        fuelCapacityLiters: parsed.data.fuel_capacity_liters ?? null,
        currentFuelPct: parsed.data.current_fuel_pct,
        facilityId: parsed.data.facility_id ?? null,
        assignedDriverId: parsed.data.assigned_driver_id ?? null,
        status: 'AVAILABLE',
        currentLocation: null,
        lastTelemetryAt: null,
      },
      user
    );

    return apiSuccess(vehicle, { message: 'Vehicle registered successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
