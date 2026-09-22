import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { optimizationApplySchema } from '@/lib/validation';
import { applyOptimizationRun } from '@/lib/services/optimization.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json().catch(() => ({}));

    const parsed = optimizationApplySchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await applyOptimizationRun(
      params.id,
      {
        createTrips: parsed.data.create_trips,
        assignShipments: parsed.data.assign_shipments,
        lockVehicles: parsed.data.lock_vehicles,
        notes: parsed.data.notes,
      },
      user
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
