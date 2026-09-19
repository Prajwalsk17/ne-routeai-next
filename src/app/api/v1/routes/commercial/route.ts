import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { commercialRouteConstraintSchema } from '@/lib/validation';
import { getGeocodingAdapter } from '@/lib/adapters/geocoding';
import { getRoutingAdapter } from '@/lib/adapters/routing';
import { getWeatherAdapter } from '@/lib/adapters/weather';
import { getProbabilisticRiskEngine } from '@/lib/services/probabilistic-risk.service';
import { Coordinates } from '@/lib/providers/types';
import { HazmatClass } from '@/lib/adapters/routing/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = commercialRouteConstraintSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { origin_id, destination_id, vehicle_profile, departure_time } = parsed.data;
    const geocoding = getGeocodingAdapter();
    const routingAdapter = getRoutingAdapter();
    const weatherAdapter = getWeatherAdapter();
    const riskEngine = getProbabilisticRiskEngine();

    // 1. Resolve Origin and Destination coordinates
    const originResults = await geocoding.search(origin_id, { limit: 1 });
    const destResults = await geocoding.search(destination_id, { limit: 1 });

    const origin: Coordinates = originResults[0]
      ? { lat: originResults[0].lat, lng: originResults[0].lng }
      : { lat: 26.1445, lng: 91.7362 };

    const destination: Coordinates = destResults[0]
      ? { lat: destResults[0].lat, lng: destResults[0].lng }
      : { lat: 25.6751, lng: 94.1086 };

    // 2. Commercial Routing Calculation with 50+ Constraint Solver
    const hazmatClassesTyped = vehicle_profile?.hazmatClasses
      ? (vehicle_profile.hazmatClasses as HazmatClass[])
      : undefined;

    const routeResult = await routingAdapter.calculateRoute(origin, destination, {
      vehicleProfile: vehicle_profile ? {
        ...vehicle_profile,
        hazmatClasses: hazmatClassesTyped,
      } : undefined,
      departureTime: departure_time,
    });

    // 3. Hyperlocal Weather on Route
    const samplePoints: Coordinates[] = [
      origin,
      ...routeResult.segments.map((s) => s.endPoint),
      destination,
    ];
    const weatherMetrics = await weatherAdapter.getWeatherAlongRoute(samplePoints);

    // 4. Multi-Variable Probabilistic Risk Index (0.0 to 1.0)
    const probabilisticRisk = await riskEngine.computeRisk(
      routeResult.segments,
      weatherMetrics,
      []
    );

    return apiSuccess({
      route: routeResult,
      constraintEvaluation: routeResult.constraintEvaluation,
      weatherMetrics,
      probabilisticRisk,
    }, {
      originName: originResults[0]?.name || origin_id,
      destinationName: destResults[0]?.name || destination_id,
      compliant: routeResult.constraintEvaluation?.isCompliant ?? true,
      riskLevel: probabilisticRisk.riskLevel,
    });
  } catch (err: unknown) {
    console.error('Error in commercial routing constraint endpoint:', err);
    return apiError('Failed to compute commercial route constraints', 'INTERNAL_ERROR', 500);
  }
}
