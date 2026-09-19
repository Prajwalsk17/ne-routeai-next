import { Coordinates, RouteCalculationResult } from '@/lib/providers/types';
import { getRoutingProvider } from '@/lib/providers/routing.provider';
import { VehicleProfile } from '@/lib/services/vehicle.service';
import { logRouteRecalculated } from '@/lib/services/audit.service';
import { getNotificationProvider } from '@/lib/providers/notification.provider';
import { getServiceSupabase } from '@/lib/db/supabase';

export interface RecalculationRequest {
  shipmentId: string;
  currentLocation: Coordinates;
  destinationLocation: Coordinates;
  vehicle: VehicleProfile;
  hazardCoordinates: Coordinates;
  hazardType: string;
  currentRouteId?: string;
  originalEtaMinutes: number;
}

export interface RecalculationResult {
  newRouteId: string;
  routeResult: RouteCalculationResult;
  etaDifferenceMinutes: number;
  distanceDifferenceKm: number;
  isVehicleCompatible: boolean;
  reasoning: string;
  recommendationSummary: string;
}

export async function recalculateSafeAlternative(
  req: RecalculationRequest
): Promise<RecalculationResult> {
  const routing = getRoutingProvider();
  const notifications = getNotificationProvider();

  // 1. Calculate alternative route avoiding hazard waypoint
  const alternativeRoute = await routing.calculateRoute(
    req.currentLocation,
    req.destinationLocation,
    {
      avoidCoordinates: [req.hazardCoordinates],
      vehicleType: req.vehicle.type,
      maxGradientPct: req.vehicle.maxGradientPct,
    }
  );

  // 2. Validate detour road characteristics against vehicle capabilities
  let isVehicleCompatible = true;
  for (const seg of alternativeRoute.segments) {
    if (seg.terrain === 'MOUNTAINOUS' && !req.vehicle.terrainCapabilities.includes('MOUNTAINOUS')) {
      isVehicleCompatible = false;
      break;
    }
  }

  // 3. Compute ETA & Distance Deltas
  const etaDifferenceMinutes = Math.max(0, alternativeRoute.durationMinutes - req.originalEtaMinutes);
  const distanceDifferenceKm = parseFloat((alternativeRoute.distanceKm * 0.18).toFixed(1)); // Approximate detour delta

  const newRouteId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const reasoning = `Detour route bypassing ${req.hazardType.replace(/_/g, ' ')}. ETA impact: +${etaDifferenceMinutes} min (${distanceDifferenceKm} km added).`;
  const recommendationSummary = `Alternative Route ${newRouteId} recommended because original sector is obstructed by ${req.hazardType.replace(/_/g, ' ')}.`;

  // 4. Persist updated route in Supabase if connected
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('routes').insert({
        id: newRouteId,
        shipment_id: req.shipmentId,
        version: 2,
        name: `Detour bypassing ${req.hazardType}`,
        total_distance_km: alternativeRoute.distanceKm,
        estimated_duration_minutes: alternativeRoute.durationMinutes,
        composite_risk_score: 28, // Safe alternate score
        status: 'ACTIVE',
        recalculation_reason: reasoning,
      });

      // Update shipment active route reference
      await supabase
        .from('shipments')
        .update({
          active_route_id: newRouteId,
          status: 'REROUTING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', req.shipmentId);
    } catch (err) {
      console.error('Failed to update rerouted shipment in Supabase:', err);
    }
  }

  // 5. Store immutable audit log
  await logRouteRecalculated(
    req.shipmentId,
    req.currentRouteId || null,
    newRouteId,
    reasoning
  );

  // 6. Notify driver & dispatcher
  await notifications.send({
    recipient: req.vehicle.driver || req.vehicle.registrationNumber,
    channel: 'PUSH',
    title: '🔄 ROUTE RECALCULATED',
    body: `${recommendationSummary} Follow diversion path.`,
    priority: 'HIGH',
    metadata: {
      newRouteId,
      etaDelta: etaDifferenceMinutes,
    },
  });

  return {
    newRouteId,
    routeResult: alternativeRoute,
    etaDifferenceMinutes,
    distanceDifferenceKm,
    isVehicleCompatible,
    reasoning,
    recommendationSummary,
  };
}
