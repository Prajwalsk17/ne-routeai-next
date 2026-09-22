import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { optimizationRequestSchema } from '@/lib/validation';
import { runOptimization } from '@/lib/services/optimization.service';
import { OptimizationInputPayload } from '@/lib/types/optimization';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'routes:calculate');
    const body = await request.json();

    const parsed = optimizationRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const payload: OptimizationInputPayload = {
      organizationId: user.organizationId || undefined,
      depotFacilityId: parsed.data.depot_facility_id,
      depotCoordinates: parsed.data.depot_coordinates,
      shipmentIds: parsed.data.shipment_ids,
      shipments: parsed.data.shipments as any,
      vehicleIds: parsed.data.vehicle_ids,
      vehicles: parsed.data.vehicles as any,
      driverIds: parsed.data.driver_ids,
      drivers: parsed.data.drivers as any,
      primaryObjective: parsed.data.primary_objective as any,
      objectiveWeights: parsed.data.objective_weights
        ? {
            durationWeight: parsed.data.objective_weights.duration_weight,
            distanceWeight: parsed.data.objective_weights.distance_weight,
            riskWeight: parsed.data.objective_weights.risk_weight,
            fleetCostWeight: parsed.data.objective_weights.fleet_cost_weight,
          }
        : undefined,
      algorithm: parsed.data.algorithm as any,
      allowPartialFulfillment: parsed.data.allow_partial_fulfillment,
      timeLimitSeconds: parsed.data.time_limit_seconds,
    };

    const result = await runOptimization(payload, user);
    return apiSuccess(result, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
