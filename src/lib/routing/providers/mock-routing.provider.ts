/**
 * AuraNER / NER-Route AI — Automated Test Mock Routing Provider
 * 
 * FOR AUTOMATED TESTING ONLY.
 * Provides deterministic, network-free route calculation results for CI/CD test suites.
 * Clearly demarcated from production providers.
 */

import {
  Coordinates,
  RoutingService,
  RouteCalculationConstraints,
  RouteCalculationResult,
  RouteSegment,
  DistanceMatrixResult,
  ProviderTimeoutError,
  ProviderUnavailableError,
  RouteNotFoundError,
} from '@/lib/routing/types';

export class MockTestRoutingService implements RoutingService {
  public readonly providerName = 'Mock Test Routing Engine (Test Runner Only)';
  private shouldFail = false;
  private shouldTimeout = false;
  private shouldNotFound = false;

  public setSimulateFailure(fail: boolean) {
    this.shouldFail = fail;
  }

  public setSimulateTimeout(timeout: boolean) {
    this.shouldTimeout = timeout;
  }

  public setSimulateNotFound(notFound: boolean) {
    this.shouldNotFound = notFound;
  }

  async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    constraints?: RouteCalculationConstraints
  ): Promise<RouteCalculationResult> {
    if (this.shouldTimeout) {
      throw new ProviderTimeoutError(this.providerName, 8000);
    }
    if (this.shouldFail) {
      throw new ProviderUnavailableError(this.providerName, 'Simulated connection refusal for testing');
    }
    if (this.shouldNotFound) {
      throw new RouteNotFoundError(origin, destination);
    }

    // Deterministic geometry between origin and destination
    const geometry: [number, number][] = [
      [origin.lng, origin.lat],
      [origin.lng + (destination.lng - origin.lng) * 0.5, origin.lat + (destination.lat - origin.lat) * 0.5],
      [destination.lng, destination.lat],
    ];

    const dLat = destination.lat - origin.lat;
    const dLng = destination.lng - origin.lng;
    const straightDistKm = Math.hypot(dLat, dLng) * 111;
    const distanceKm = parseFloat((straightDistKm * 1.35).toFixed(1));
    const durationMinutes = Math.round(distanceKm * 1.8);

    const segments: RouteSegment[] = [
      {
        segmentOrder: 1,
        name: 'Sector A: Valley Highway Segment',
        highwayCode: 'NH-27',
        geometry: [
          [origin.lng, origin.lat],
          [origin.lng + (destination.lng - origin.lng) * 0.5, origin.lat + (destination.lat - origin.lat) * 0.5],
        ],
        distanceKm: parseFloat((distanceKm * 0.5).toFixed(1)),
        durationMinutes: Math.round(durationMinutes * 0.45),
        terrain: 'PLAIN',
        roadConditionScore: 88,
        maxWidthMeters: 3.5,
      },
      {
        segmentOrder: 2,
        name: 'Sector B: Mountain Pass Segment',
        highwayCode: 'NH-29',
        geometry: [
          [origin.lng + (destination.lng - origin.lng) * 0.5, origin.lat + (destination.lat - origin.lat) * 0.5],
          [destination.lng, destination.lat],
        ],
        distanceKm: parseFloat((distanceKm * 0.5).toFixed(1)),
        durationMinutes: Math.round(durationMinutes * 0.55),
        terrain: 'MOUNTAINOUS',
        roadConditionScore: 70,
        maxWidthMeters: 2.4,
        bridgeWeightLimitTons: 25,
      },
    ];

    return {
      geometry,
      distanceKm,
      durationMinutes,
      elevationGainMeters: 850,
      maxGradientPct: 18,
      segments,
      provenance: {
        providerName: this.providerName,
        providerVersion: 'Mock v1.0',
        calculationTimestamp: new Date().toISOString(),
        latencyMs: 12,
        cacheStatus: 'LIVE',
        routeHash: `mock_${distanceKm}_${durationMinutes}`,
      },
    };
  }

  async calculateMatrix(
    origins: Coordinates[],
    destinations: Coordinates[]
  ): Promise<DistanceMatrixResult> {
    if (this.shouldFail) {
      throw new ProviderUnavailableError(this.providerName, 'Simulated matrix failure');
    }

    const distancesKm: number[][] = origins.map((orig) =>
      destinations.map((dest) => {
        const dist = Math.hypot(dest.lat - orig.lat, dest.lng - orig.lng) * 111 * 1.3;
        return parseFloat(dist.toFixed(1));
      })
    );

    const durationsMinutes: number[][] = distancesKm.map((row) =>
      row.map((d) => Math.round(d * 1.8))
    );

    return {
      origins,
      destinations,
      distancesKm,
      durationsMinutes,
      provenance: {
        providerName: this.providerName,
        providerVersion: 'Mock v1.0',
        calculationTimestamp: new Date().toISOString(),
        latencyMs: 5,
        cacheStatus: 'LIVE',
        routeHash: `mock_matrix_${origins.length}x${destinations.length}`,
      },
    };
  }
}
