import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { calculateRiskSchema } from '@/lib/validation';
import { calculateProductionRisk } from '@/lib/services/risk.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'routes:calculate');
    const body = await request.json();

    const parsed = calculateRiskSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const input = {
      tripId: parsed.data.trip_id,
      shipmentId: parsed.data.shipment_id,
      routeSegments: parsed.data.route_segments,
      vehicleLocation: parsed.data.vehicle_location,
      weatherEvents: parsed.data.weather_events,
      roadEvents: parsed.data.road_events,
      accessibilityEvents: parsed.data.accessibility_events,
      riskEvents: parsed.data.risk_events,
      telemetry: parsed.data.telemetry
        ? {
            speedKmh: parsed.data.telemetry.speed_kmh,
            speedVariance: parsed.data.telemetry.speed_variance,
            gpsMultipathJitterMeters: parsed.data.telemetry.gps_multipath_jitter_meters,
            deadReckoningDurationSeconds: parsed.data.telemetry.dead_reckoning_duration_seconds,
            lastTelemetryTimestamp: parsed.data.telemetry.last_telemetry_timestamp,
          }
        : undefined,
      vehicleSpecs: parsed.data.vehicle_specs
        ? {
            maxGradientPercent: parsed.data.vehicle_specs.max_gradient_percent,
            grossWeightTonnes: parsed.data.vehicle_specs.gross_weight_tonnes,
            waterFordingDepthMm: parsed.data.vehicle_specs.water_fording_depth_mm,
            hasColdChain: parsed.data.vehicle_specs.has_cold_chain,
          }
        : undefined,
      options: {
        customWeights: parsed.data.options?.custom_weights,
        includeAiReasoning: parsed.data.options?.include_ai_reasoning,
      },
    };

    const assessment = await calculateProductionRisk(input, user.id);

    const routeCoordinates =
      (body.route_coordinates as Array<[number, number] | { lat: number; lng: number }>) ||
      parsed.data.route_segments?.flatMap((s: any) => [s.start_point || s.startPoint, s.end_point || s.endPoint].filter(Boolean)) ||
      [];

    if (routeCoordinates.length > 0) {
      const { intersectRouteWithHazards } = await import('@/lib/services/risk.service');
      (assessment as any).routeHazardIntersections = intersectRouteWithHazards(
        routeCoordinates,
        parsed.data.risk_events
      );
    }

    return apiSuccess(assessment);
  } catch (error) {
    return handleApiError(error);
  }
}
