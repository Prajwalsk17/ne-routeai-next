import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { vehicleUpdateSchema } from '@/lib/validation';
import { getVehicleById, updateVehicle, archiveVehicle } from '@/lib/services/fleet.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:read');
    const vehicle = await getVehicleById(params.id, user);
    return apiSuccess(vehicle);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:manage');
    const body = await request.json();
    const parsed = vehicleUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.registration_number) updates.registrationNumber = parsed.data.registration_number;
    if (parsed.data.make_model) updates.makeModel = parsed.data.make_model;
    if (parsed.data.type) updates.type = parsed.data.type;
    if (parsed.data.payload_capacity_kg !== undefined) updates.payloadCapacityKg = parsed.data.payload_capacity_kg;
    if (parsed.data.cargo_volume_m3 !== undefined) updates.cargoVolumeM3 = parsed.data.cargo_volume_m3;
    if (parsed.data.max_gradient_pct !== undefined) updates.maxGradientPct = parsed.data.max_gradient_pct;
    if (parsed.data.max_width_meters !== undefined) updates.maxWidthMeters = parsed.data.max_width_meters;
    if (parsed.data.water_crossing_depth_mm !== undefined) updates.waterCrossingDepthMm = parsed.data.water_crossing_depth_mm;
    if (parsed.data.has_cold_chain !== undefined) updates.hasColdChain = parsed.data.has_cold_chain;
    if (parsed.data.fuel_type) updates.fuelType = parsed.data.fuel_type;
    if (parsed.data.fuel_capacity_liters !== undefined) updates.fuelCapacityLiters = parsed.data.fuel_capacity_liters;
    if (parsed.data.current_fuel_pct !== undefined) updates.currentFuelPct = parsed.data.current_fuel_pct;
    if (parsed.data.facility_id !== undefined) updates.facilityId = parsed.data.facility_id;
    if (parsed.data.assigned_driver_id !== undefined) updates.assignedDriverId = parsed.data.assigned_driver_id;
    if (parsed.data.status) updates.status = parsed.data.status;

    const updated = await updateVehicle(params.id, updates, user);
    return apiSuccess(updated, { message: 'Vehicle updated successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:manage');
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const result = await archiveVehicle(params.id, user, reason);
    return apiSuccess(result, { message: 'Vehicle archived/decommissioned successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
