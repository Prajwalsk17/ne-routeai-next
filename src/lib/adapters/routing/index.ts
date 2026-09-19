// =============================================================================
// AuraNER / NER-RouteAI — Enterprise Routing Adapter & Factory
// Commercial fleet routing, 50+ constraint evaluation & Matrix VRP integration
// =============================================================================

import { Coordinates, RouteCalculationResult } from '@/lib/providers/types';
import {
  CommercialVehicleProfile,
  ConstraintEvaluationResult,
  IRoutingAdapter,
  MatrixRequest,
  MatrixResponse,
} from '@/lib/adapters/routing/types';
import { CommercialConstraintSolver } from '@/lib/adapters/routing/constraint-solver';
import { DistanceTimeMatrixSolver } from '@/lib/adapters/routing/matrix';
import { CircuitBreaker } from '@/lib/adapters/circuit-breaker';
import { OsrmRoutingProvider } from '@/lib/providers/routing.provider';
import { getEnv } from '@/lib/env';

export class EnterpriseRoutingAdapter implements IRoutingAdapter {
  public readonly name: string;
  private readonly fallbackProvider: OsrmRoutingProvider;
  private readonly matrixSolver: DistanceTimeMatrixSolver;
  private readonly constraintSolver: CommercialConstraintSolver;
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.name = 'EnterpriseRoutingPipeline';
    this.fallbackProvider = new OsrmRoutingProvider();
    this.matrixSolver = new DistanceTimeMatrixSolver();
    this.constraintSolver = new CommercialConstraintSolver();
    this.circuitBreaker = new CircuitBreaker({
      name: 'EnterpriseCommercialRoutingService',
      failureThreshold: 3,
      recoveryTimeoutMs: 30_000,
    });
  }

  public async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: {
      avoidCoordinates?: Coordinates[];
      vehicleProfile?: Partial<CommercialVehicleProfile>;
      departureTime?: string;
      waypoints?: Coordinates[];
    }
  ): Promise<RouteCalculationResult & { constraintEvaluation?: ConstraintEvaluationResult }> {
    const env = getEnv();

    // 1. Calculate raw geometric route (Enterprise or Circuit-Breaker Fallback)
    let routeResult: RouteCalculationResult;

    if (env.ROUTING_PROVIDER === 'nextbillion' && env.NEXTBILLION_API_KEY) {
      routeResult = await this.circuitBreaker.execute(
        () => this.callNextBillionRoute(origin, destination, options),
        () => this.fallbackProvider.calculateRoute(origin, destination, {
          avoidCoordinates: options?.avoidCoordinates,
          vehicleType: options?.vehicleProfile ? 'heavy_truck' : 'truck',
        })
      );
    } else if (env.ROUTING_PROVIDER === 'google' && env.GOOGLE_MAPS_API_KEY) {
      routeResult = await this.circuitBreaker.execute(
        () => this.callGoogleRoutesAdvanced(origin, destination, options),
        () => this.fallbackProvider.calculateRoute(origin, destination, {
          avoidCoordinates: options?.avoidCoordinates,
        })
      );
    } else {
      routeResult = await this.fallbackProvider.calculateRoute(origin, destination, {
        avoidCoordinates: options?.avoidCoordinates,
      });
    }

    // 2. Evaluate 50+ commercial fleet constraints
    const profile = CommercialConstraintSolver.createDefaultProfile(options?.vehicleProfile);
    const departureDate = options?.departureTime ? new Date(options.departureTime) : new Date();

    const constraintEvaluation = this.constraintSolver.evaluateRouteConstraints(
      profile,
      routeResult,
      {
        departureTime: departureDate,
        isMonsoonSeason: departureDate.getMonth() >= 5 && departureDate.getMonth() <= 8, // June - Sept
        destinationState: 'Assam',
      }
    );

    // Apply constraint delay penalty if any
    if (constraintEvaluation.adjustedDurationMinutes > routeResult.durationMinutes) {
      routeResult = {
        ...routeResult,
        durationMinutes: constraintEvaluation.adjustedDurationMinutes,
      };
    }

    return {
      ...routeResult,
      constraintEvaluation,
    };
  }

  public async calculateMatrix(request: MatrixRequest): Promise<MatrixResponse> {
    return this.matrixSolver.computeMatrix(request);
  }

  private async callNextBillionRoute(
    origin: Coordinates,
    destination: Coordinates,
    options?: {
      avoidCoordinates?: Coordinates[];
      vehicleProfile?: Partial<CommercialVehicleProfile>;
      departureTime?: string;
    }
  ): Promise<RouteCalculationResult> {
    const env = getEnv();
    const apiKey = env.NEXTBILLION_API_KEY!;
    const avoidParam = options?.avoidCoordinates && options.avoidCoordinates.length > 0
      ? `&avoid=${options.avoidCoordinates.map((a) => `${a.lat},${a.lng}`).join('|')}`
      : '';

    const url = `https://api.nextbillion.io/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=truck${avoidParam}&key=${apiKey}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!res.ok) {
      throw new Error(`NextBillion Directions API error HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.status !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('NextBillion Directions returned no routes');
    }

    const route = data.routes[0];
    const polyline = this.decodePolyline(route.geometry);

    return {
      coordinates: polyline,
      distanceKm: parseFloat(((route.distance || 0) / 1000).toFixed(1)),
      durationMinutes: Math.round((route.duration || 0) / 60),
      elevationGainMeters: Math.round(Math.abs(destination.lat - origin.lat) * 750),
      segments: [
        {
          segmentOrder: 1,
          name: route.summary || 'NextBillion Optimized Truck Corridor',
          startPoint: origin,
          endPoint: destination,
          distanceKm: parseFloat(((route.distance || 0) / 1000).toFixed(1)),
          durationMinutes: Math.round((route.duration || 0) / 60),
          terrain: origin.lat > 25.5 ? 'MOUNTAINOUS' : 'HILLY',
          roadConditionScore: 82,
          elevationMeters: 650,
        },
      ],
      providerName: 'NextBillion.ai Commercial Truck Engine',
    };
  }

  private async callGoogleRoutesAdvanced(
    origin: Coordinates,
    destination: Coordinates,
    options?: { avoidCoordinates?: Coordinates[] }
  ): Promise<RouteCalculationResult> {
    const env = getEnv();
    const apiKey = env.GOOGLE_MAPS_API_KEY!;
    const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`;

    const payload = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      computeAlternativeRoutes: false,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Google Routes API Advanced error HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Google Routes API returned no routes');
    }

    const route = data.routes[0];
    const durationSeconds = parseInt((route.duration || '0s').replace('s', ''), 10);
    const coords = this.decodePolyline(route.polyline?.encodedPolyline || '');

    return {
      coordinates: coords.length > 0 ? coords : [[origin.lng, origin.lat], [destination.lng, destination.lat]],
      distanceKm: parseFloat(((route.distanceMeters || 0) / 1000).toFixed(1)),
      durationMinutes: Math.round(durationSeconds / 60),
      elevationGainMeters: 550,
      segments: [
        {
          segmentOrder: 1,
          name: 'Google Routes Advanced Highway Corridor',
          startPoint: origin,
          endPoint: destination,
          distanceKm: parseFloat(((route.distanceMeters || 0) / 1000).toFixed(1)),
          durationMinutes: Math.round(durationSeconds / 60),
          terrain: 'PLAIN',
          roadConditionScore: 88,
        },
      ],
      providerName: 'Google Routes API (Advanced Live Traffic)',
    };
  }

  private decodePolyline(encoded: string): [number, number][] {
    if (!encoded) return [];
    const poly: [number, number][] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b: number;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push([lng * 1e-5, lat * 1e-5]); // [lng, lat]
    }
    return poly;
  }
}

let _enterpriseRoutingAdapter: IRoutingAdapter | null = null;

export function getRoutingAdapter(): IRoutingAdapter {
  if (!_enterpriseRoutingAdapter) {
    _enterpriseRoutingAdapter = new EnterpriseRoutingAdapter();
  }
  return _enterpriseRoutingAdapter;
}
