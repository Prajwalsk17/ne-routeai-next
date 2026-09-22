import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { vehicleMaintenanceCreateSchema } from '@/lib/validation';
import { listVehicleMaintenance, addVehicleMaintenance } from '@/lib/services/fleet.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:read');
    const records = await listVehicleMaintenance(params.id, user);
    return apiSuccess(records, { count: records.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:manage');
    const body = await request.json();
    const parsed = vehicleMaintenanceCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const record = await addVehicleMaintenance(
      params.id,
      {
        maintenanceType: parsed.data.maintenance_type,
        odometerKm: parsed.data.odometer_km,
        description: parsed.data.description,
        costInr: parsed.data.cost_inr ?? null,
        performedAt: parsed.data.performed_at,
        nextServiceDueKm: parsed.data.next_service_due_km ?? null,
        serviceProvider: parsed.data.service_provider,
      },
      user
    );

    return apiSuccess(record, { message: 'Maintenance record logged successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
