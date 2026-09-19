import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '@/lib/adapters/circuit-breaker';
import { ExtendedKalmanFilter } from '@/lib/telemetry/kalman';
import { CommercialConstraintSolver } from '@/lib/adapters/routing/constraint-solver';
import { ProbabilisticRiskEngine } from '@/lib/services/probabilistic-risk.service';
import { HmmMapMatchingEngine } from '@/lib/adapters/geocoding/map-matching';
import { EnterpriseWeatherAdapter } from '@/lib/adapters/weather';
import { EnterpriseTelemetryAdapter } from '@/lib/adapters/telemetry';
import { Coordinates, RouteCalculationResult } from '@/lib/providers/types';

describe('Enterprise Architecture & Modular Adapters Verification', () => {
  // ===========================================================================
  // 1. CIRCUIT BREAKER RESILIENCE
  // ===========================================================================
  describe('CircuitBreaker State Transitions & Fallbacks', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
      cb = new CircuitBreaker({
        name: 'TestService',
        failureThreshold: 2,
        recoveryTimeoutMs: 50, // fast cooldown for tests
        successThreshold: 1,
      });
    });

    it('starts in CLOSED state and executes primary action successfully', async () => {
      expect(cb.getState()).toBe('CLOSED');
      const result = await cb.execute(
        async () => 'primary-success',
        async () => 'fallback-result'
      );
      expect(result).toBe('primary-success');
      expect(cb.getState()).toBe('CLOSED');
    });

    it('trips to OPEN state after reaching failure threshold and routes to fallback', async () => {
      // Failure 1: Primary fails, fallback executes
      const res1 = await cb.execute(
        async () => { throw new Error('HTTP 503 Service Unavailable'); },
        async () => 'fallback-1'
      );
      expect(res1).toBe('fallback-1');
      expect(cb.getState()).toBe('CLOSED'); // Not yet reached threshold of 2

      // Failure 2: Primary fails, circuit should now open
      const res2 = await cb.execute(
        async () => { throw new Error('HTTP 429 Quota Exceeded'); },
        async () => 'fallback-2'
      );
      expect(res2).toBe('fallback-2');
      expect(cb.getState()).toBe('OPEN');

      // Subsequent call in OPEN state fast-fails directly to fallback without calling primary
      let primaryCalled = false;
      const res3 = await cb.execute(
        async () => { primaryCalled = true; return 'should-not-run'; },
        async () => 'fast-fallback'
      );
      expect(res3).toBe('fast-fallback');
      expect(primaryCalled).toBe(false);
    });

    it('transitions to HALF_OPEN after recovery timeout and closes upon success', async () => {
      cb.trip();
      expect(cb.getState()).toBe('OPEN');

      // Wait for recovery timeout
      await new Promise((r) => setTimeout(r, 60));
      expect(cb.getState()).toBe('HALF_OPEN');

      // Successful call in HALF_OPEN recovers circuit to CLOSED
      const result = await cb.execute(
        async () => 'recovered',
        async () => 'fallback'
      );
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  // ===========================================================================
  // 2. EXTENDED KALMAN FILTER (EKF)
  // ===========================================================================
  describe('Extended Kalman Filter (EKF) Telemetry Smoothing', () => {
    it('smooths noisy GPS multipath jitter and estimates velocity and heading', () => {
      const initialLat = 26.1445;
      const initialLng = 91.7362;
      const t0 = 1700000000000;

      const ekf = new ExtendedKalmanFilter(initialLat, initialLng, t0);

      // Simulate vehicle driving East (~60 km/h) with GPS noise
      // 1 deg lng at lat 26 is ~100km, so 60 km/h = ~16.6 m/s = ~0.000166 deg/s
      let state = ekf.getState();
      expect(state.lat).toBeCloseTo(initialLat, 4);
      expect(state.lng).toBeCloseTo(initialLng, 4);

      // Update with noisy measurement 1 second later
      const t1 = t0 + 1000;
      const measuredLat = initialLat + 0.00005; // Jitter North
      const measuredLng = initialLng + 0.00015; // Moving East

      state = ekf.update(measuredLat, measuredLng, t1, 4.0);

      expect(state.speedKmh).toBeGreaterThan(0);
      expect(state.accuracyMeters).toBeGreaterThan(0);
      expect(state.headingDegrees).toBeGreaterThanOrEqual(0);
      expect(state.headingDegrees).toBeLessThanOrEqual(360);
    });

    it('performs dead reckoning projection when GPS fix is temporarily lost', () => {
      const initialLat = 26.1445;
      const initialLng = 91.7362;
      const t0 = 1700000000000;

      const ekf = new ExtendedKalmanFilter(initialLat, initialLng, t0);

      // Give 2 updates to establish velocity vector
      ekf.update(initialLat, initialLng + 0.0002, t0 + 1000, 3.0);
      ekf.update(initialLat, initialLng + 0.0004, t0 + 2000, 3.0);

      const stateBeforeReckoning = ekf.getState();

      // Project forward 5 seconds during signal loss
      const deadReckonedState = ekf.predictDeadReckoning(5);

      // Longitude should have advanced further East in dead reckoning
      expect(deadReckonedState.lng).toBeGreaterThan(stateBeforeReckoning.lng);
      // Uncertainty (accuracyMeters) should have grown due to absence of measurement
      expect(deadReckonedState.accuracyMeters).toBeGreaterThanOrEqual(stateBeforeReckoning.accuracyMeters);
    });
  });

  // ===========================================================================
  // 3. 50+ COMMERCIAL FLEET CONSTRAINT SOLVER
  // ===========================================================================
  describe('Commercial Fleet Constraint Solver (50+ Parameters)', () => {
    const solver = new CommercialConstraintSolver();

    const mockMountainRoute: RouteCalculationResult = {
      coordinates: [[91.7362, 26.1445], [92.4178, 27.2647]],
      distanceKm: 280,
      durationMinutes: 480,
      elevationGainMeters: 2350,
      segments: [
        {
          segmentOrder: 1,
          name: 'Brahmaputra Valley Highway',
          startPoint: { lat: 26.1445, lng: 91.7362 },
          endPoint: { lat: 26.7000, lng: 92.1000 },
          distanceKm: 90,
          durationMinutes: 120,
          terrain: 'PLAIN',
          roadConditionScore: 85,
        },
        {
          segmentOrder: 2,
          name: 'Bomdila Mountain Pass Link',
          startPoint: { lat: 26.7000, lng: 92.1000 },
          endPoint: { lat: 27.2647, lng: 92.4178 },
          distanceKm: 190,
          durationMinutes: 360,
          terrain: 'MOUNTAINOUS',
          roadConditionScore: 65,
          elevationMeters: 2415,
        },
      ],
      providerName: 'Test-Graph',
    };

    it('validates a compliant heavy vehicle and verifies evaluated parameter count', () => {
      const profile = CommercialConstraintSolver.createDefaultProfile();
      const evalResult = solver.evaluateRouteConstraints(profile, mockMountainRoute);

      expect(evalResult.totalEvaluatedParametersCount).toBe(50);
      expect(evalResult.compliantParametersCount).toBeGreaterThan(40);
      expect(evalResult.hasBlockingViolations).toBe(false);
      expect(evalResult.isCompliant).toBe(true);
    });

    it('blocks vehicle when gross vehicle weight exceeds corridor bridge rating', () => {
      const overweightProfile = CommercialConstraintSolver.createDefaultProfile({
        grossVehicleWeightKg: 45000, // 45 tonnes on 20 tonne mountain bridge
      });

      const evalResult = solver.evaluateRouteConstraints(overweightProfile, mockMountainRoute);
      expect(evalResult.hasBlockingViolations).toBe(true);
      expect(evalResult.isCompliant).toBe(false);
      expect(evalResult.violations.some((v) => v.code === 'PHYS_GVW_EXCEEDED')).toBe(true);
    });

    it('enforces Hazmat Tunnel Restriction Code E against Class 1 Explosives in tunnels', () => {
      const hazmatProfile = CommercialConstraintSolver.createDefaultProfile({
        isCarryingHazmat: true,
        hazmatClasses: ['CLASS_1_EXPLOSIVES'],
        tunnelRestrictionCode: 'E',
        requiresHazmatPlacard: true,
        requiresEmergencyResponseGuide: true,
        hazmatRouteAuthorized: true,
      });

      const evalResult = solver.evaluateRouteConstraints(hazmatProfile, mockMountainRoute, {
        hasTunnelPassage: true,
      });

      expect(evalResult.hasBlockingViolations).toBe(true);
      expect(evalResult.violations.some((v) => v.code === 'HAZ_TUNNEL_RESTRICTION_E')).toBe(true);
    });

    it('enforces bridge vertical clearance tolerances against high cube trucks', () => {
      const tallProfile = CommercialConstraintSolver.createDefaultProfile({
        heightMeters: 4.4, // Standard bridge is 4.1m
      });

      const evalResult = solver.evaluateRouteConstraints(tallProfile, mockMountainRoute);
      expect(evalResult.hasBlockingViolations).toBe(true);
      expect(evalResult.violations.some((v) => v.code === 'PHYS_HEIGHT_UNDERPASS_RESTRICTION')).toBe(true);
    });
  });

  // ===========================================================================
  // 4. MULTI-VARIABLE PROBABILISTIC RISK ENGINE
  // ===========================================================================
  describe('Probabilistic Risk Engine & Standard Event Flags', () => {
    const riskEngine = new ProbabilisticRiskEngine();

    const mockSegments = [
      {
        segmentOrder: 1,
        name: 'Zubza Mountain Sector',
        startPoint: { lat: 25.6880, lng: 94.0520 },
        endPoint: { lat: 25.7500, lng: 94.1000 },
        distanceKm: 25,
        durationMinutes: 45,
        terrain: 'MOUNTAINOUS' as const,
        roadConditionScore: 60,
      },
    ];

    it('computes composite risk score according to weighted probabilistic formula', async () => {
      const mockWeather = [
        {
          lat: 25.6880,
          lng: 94.0520,
          temperatureCelsius: 18,
          feelsLikeCelsius: 17,
          precipitationIntensityMmH: 2.0,
          precipitationProbabilityPct: 30,
          atmosphericVisibilityKm: 6.0,
          surfaceWindSpeedKmh: 15,
          surfaceWindGustKmh: 25,
          windDirectionDegrees: 180,
          roadFreezingRisk: false,
          roadFreezingProbability: 0.0,
          hydroplaningRiskIndex: 0.1,
          conditionText: 'Overcast',
          isSevereWarning: false,
          severeAlerts: [],
          nwpModelSource: 'OPEN_METEO_ICON_7KM' as const,
          dataFreshness: 'VERIFIED_FRESH' as const,
          dataAgeSeconds: 120,
          timestamp: new Date().toISOString(),
        },
      ];

      const result = await riskEngine.computeRisk(mockSegments, mockWeather, []);

      expect(result.compositeRiskScore).toBeGreaterThanOrEqual(0.0);
      expect(result.compositeRiskScore).toBeLessThanOrEqual(1.0);
      // Verify mathematical weights
      const totalWeight =
        result.weights.w1_hazardZones +
        result.weights.w2_roadAttributes +
        result.weights.w3_weather +
        result.weights.w4_telemetryRisk;
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('triggers standard hazard flags: HYDROPLANING_RISK, HIGH_WIND_WARNING, ICE_ROAD_HAZARD', async () => {
      const severeWeather = [
        {
          lat: 25.6880,
          lng: 94.0520,
          temperatureCelsius: -1.5, // Below freezing
          feelsLikeCelsius: -5.0,
          precipitationIntensityMmH: 16.0, // Torrential
          precipitationProbabilityPct: 95,
          atmosphericVisibilityKm: 1.2,
          surfaceWindSpeedKmh: 45,
          surfaceWindGustKmh: 68, // Wind gust > 50km/h
          windDirectionDegrees: 270,
          roadFreezingRisk: true,
          roadFreezingProbability: 0.9,
          hydroplaningRiskIndex: 0.8,
          conditionText: 'Blizzard / Freezing Rain',
          isSevereWarning: true,
          severeAlerts: [],
          nwpModelSource: 'TOMORROW_IO_ROUTES' as const,
          dataFreshness: 'VERIFIED_FRESH' as const,
          dataAgeSeconds: 60,
          timestamp: new Date().toISOString(),
        },
      ];

      const result = await riskEngine.computeRisk(mockSegments, severeWeather, []);

      expect(result.activeHazardFlags).toContain('HYDROPLANING_RISK');
      expect(result.activeHazardFlags).toContain('HIGH_WIND_WARNING');
      expect(result.activeHazardFlags).toContain('ICE_ROAD_HAZARD');
      expect(result.riskLevel).toBe('CRITICAL');
    });
  });

  // ===========================================================================
  // 5. HMM MAP MATCHING ENGINE
  // ===========================================================================
  describe('Hidden Markov Model (HMM) Map Matching', () => {
    const mapMatcher = new HmmMapMatchingEngine();

    it('snaps a noisy GPS trace onto reference road network using Viterbi decoding', async () => {
      // Simulate GPS points along NH-27 with +15m lateral multipath jitter
      const rawTrace = [
        { lat: 26.1448, lng: 91.7360 },
        { lat: 26.1455, lng: 91.7370 },
        { lat: 26.1462, lng: 91.7380 },
      ];

      const match = await mapMatcher.matchGpsTrace(rawTrace);

      expect(match.snappedPoints.length).toBe(3);
      expect(match.polylineCoordinates.length).toBe(3);
      expect(match.matchConfidence).toBeGreaterThan(0.8);

      // Verify each point was snapped and has recorded offset
      for (const pt of match.snappedPoints) {
        expect(pt.snappedLat).toBeDefined();
        expect(pt.snappedLng).toBeDefined();
        expect(pt.distanceOffsetMeters).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ===========================================================================
  // 6. WEATHER FRESHNESS ENGINE
  // ===========================================================================
  describe('Weather Data Freshness Engine', () => {
    const weatherAdapter = new EnterpriseWeatherAdapter();

    it('flags weather observation exceeding 1800s as UNVERIFIED_STALE', () => {
      // 45 minutes ago (2700s > 1800s threshold)
      const oldTimestamp = new Date(Date.now() - 2700 * 1000).toISOString();
      const check = weatherAdapter.checkFreshness(oldTimestamp);

      expect(check.isStale).toBe(true);
      expect(check.status).toBe('UNVERIFIED_STALE');
      expect(check.ageSeconds).toBeGreaterThan(1800);
    });

    it('validates fresh weather observation within 1800s as VERIFIED_FRESH', () => {
      // 5 minutes ago (300s < 1800s threshold)
      const freshTimestamp = new Date(Date.now() - 300 * 1000).toISOString();
      const check = weatherAdapter.checkFreshness(freshTimestamp);

      expect(check.isStale).toBe(false);
      expect(check.status).toBe('VERIFIED_FRESH');
      expect(check.ageSeconds).toBeLessThan(1800);
    });
  });

  // ===========================================================================
  // 7. TELEMETRY PIPELINE & STALENESS DETECTOR
  // ===========================================================================
  describe('Telemetry Ingestion & 60s Staleness Threshold', () => {
    const telemetryAdapter = new EnterpriseTelemetryAdapter();

    it('ingests raw telemetry and filters through EKF', async () => {
      const vehicleId = 'veh-test-001';
      const record = await telemetryAdapter.ingestTelemetry({
        vehicleId,
        shipmentId: 'shp-001',
        latitude: 26.1445,
        longitude: 91.7362,
        speedKmh: 48,
        headingDegrees: 90,
      });

      expect(record.status).toBe('ONLINE');
      expect(record.filteredCoordinates.lat).toBeCloseTo(26.1445, 4);
      expect(record.isDeadReckoning).toBe(false);
    });

    it('flags vehicle exceeding 60s without positional update as OFFLINE_STALE', () => {
      const staleId = 'veh-stale-999';
      const staleCheck = telemetryAdapter.checkStaleStatus(staleId);

      expect(staleCheck.isStale).toBe(true);
      expect(staleCheck.status).toBe('OFFLINE_STALE');
    });
  });
});
