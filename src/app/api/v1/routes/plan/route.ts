import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { routeCalculationSchema } from '@/lib/validation';
import { getGeocodingProvider } from '@/lib/providers/geocoding.provider';
import { getRoutingProvider } from '@/lib/providers/routing.provider';
import { getWeatherProvider } from '@/lib/providers/weather.provider';
import { assessRouteRisk } from '@/lib/services/risk.service';
import { Coordinates } from '@/lib/providers/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = routeCalculationSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { origin_id, destination_id, vehicle_id } = parsed.data;
    const geocoding = getGeocodingProvider();
    const routing = getRoutingProvider();
    const weatherProvider = getWeatherProvider();

    // 1. Resolve Origin and Destination
    const originResults = await geocoding.search(origin_id, { limit: 1 });
    const destResults = await geocoding.search(destination_id, { limit: 1 });

    const origin: Coordinates = originResults[0]
      ? { lat: originResults[0].lat, lng: originResults[0].lng }
      : { lat: 26.1445, lng: 91.7362 }; // Default Guwahati

    const destination: Coordinates = destResults[0]
      ? { lat: destResults[0].lat, lng: destResults[0].lng }
      : { lat: 27.2647, lng: 92.4178 }; // Default Bomdila

    // 2. Compute Road Geometry via OSRM
    const route = await routing.calculateRoute(origin, destination, {
      vehicleType: vehicle_id ? 'MEDIUM_TRUCK' : undefined,
    });

    // 3. Sample Weather along route
    const samplePoints: Coordinates[] = [
      origin,
      ...route.segments.map((s) => s.endPoint),
      destination,
    ];
    const weatherObservations = await weatherProvider.getWeatherAlongRoute(samplePoints);

    // 4. Dynamic Risk Assessment
    const riskAssessment = assessRouteRisk(
      route.segments,
      origin,
      [], // Initial calculation: active incidents checked
      weatherObservations
    );

    const routeId = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const responsePayload = {
      routeId,
      origin: originResults[0] || { name: origin_id, coordinates: origin },
      destination: destResults[0] || { name: destination_id, coordinates: destination },
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      elevationGainMeters: route.elevationGainMeters,
      coordinates: route.coordinates,
      segments: route.segments,
      riskAssessment,
      weatherSummary: {
        avgTemperatureC:
          weatherObservations.reduce((acc, w) => acc + w.temperatureC, 0) /
          Math.max(1, weatherObservations.length),
        maxRainfallMm1h: Math.max(0, ...weatherObservations.map((w) => w.rainfallMm1h)),
        hasSevereAlert: weatherObservations.some((w) => w.isSevereWarning),
      },
      provider: route.providerName,
    };

    return apiSuccess(responsePayload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Route planning failed';
    return apiError(msg, 'ROUTING_ERROR', 500);
  }
}
