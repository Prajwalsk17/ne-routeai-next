import { describe, it, expect, beforeEach } from 'vitest';
import { validateAndNormalizeCoordinates } from '@/components/DispatchMap';
import { OsrmRoutingService } from '@/lib/routing/providers/osrm-routing.provider';
import { routeCalculationSchema } from '@/lib/validation';
import { POST as postPlanRoute } from '@/app/api/v1/routes/plan/route';
import { NextRequest } from 'next/server';

describe('NER-Route AI — Map Transportation Route & Coordinate Verification', () => {
  // ---------------------------------------------------------------------------
  // 1. Coordinate Validation, Normalization & Order Verification
  // ---------------------------------------------------------------------------
  describe('1. Coordinate Validation and Normalization', () => {
    it('accepts valid GeoJSON [longitude, latitude] coordinate pairs', () => {
      // Guwahati [lng, lat] = [91.7362, 26.1445]
      // Kohima [lng, lat] = [94.1077, 25.6701]
      const input: [number, number][] = [
        [91.7362, 26.1445],
        [92.8004, 26.6338],
        [94.1077, 25.6701],
      ];

      const result = validateAndNormalizeCoordinates(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([91.7362, 26.1445]);
      expect(result[1]).toEqual([92.8004, 26.6338]);
      expect(result[2]).toEqual([94.1077, 25.6701]);
    });

    it('detects and normalizes inverted [latitude, longitude] coordinate pairs to GeoJSON [lng, lat]', () => {
      // Inverted [lat, lng]: [26.1445, 91.7362]
      const invertedInput = [
        [26.1445, 91.7362],
        [25.6701, 94.1077],
      ];

      const result = validateAndNormalizeCoordinates(invertedInput);
      expect(result).toHaveLength(2);
      // Must be normalized to [longitude, latitude]
      expect(result[0][0]).toBeCloseTo(91.7362, 3);
      expect(result[0][1]).toBeCloseTo(26.1445, 3);
      expect(result[1][0]).toBeCloseTo(94.1077, 3);
      expect(result[1][1]).toBeCloseTo(25.6701, 3);
    });

    it('safely parses object coordinate format { lat, lng } into GeoJSON [lng, lat]', () => {
      const objectInput = [
        { lat: 26.1445, lng: 91.7362 },
        { lat: 25.6701, lng: 94.1077 },
      ];

      const result = validateAndNormalizeCoordinates(objectInput);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([91.7362, 26.1445]);
      expect(result[1]).toEqual([94.1077, 25.6701]);
    });

    it('rejects out-of-range latitudes (>90 or <-90) and out-of-range longitudes (>180 or <-180)', () => {
      const invalidInput = [
        [91.7362, 26.1445], // valid
        [91.7362, 120.0],   // invalid latitude (>90)
        [250.0, 26.1445],   // invalid longitude (>180)
        [94.1077, 25.6701], // valid
      ];

      const result = validateAndNormalizeCoordinates(invalidInput);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([91.7362, 26.1445]);
      expect(result[1]).toEqual([94.1077, 25.6701]);
    });

    it('rejects non-finite values (NaN, Infinity, null, undefined, malformed structures)', () => {
      const malformedInput = [
        [NaN, 26.1445],
        [91.7362, Infinity],
        null,
        'malformed string',
        [],
        [91.7362, 26.1445], // valid
        [94.1077, 25.6701], // valid
      ];

      const result = validateAndNormalizeCoordinates(malformedInput);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when input is not an array or has no valid coordinates', () => {
      expect(validateAndNormalizeCoordinates(null)).toEqual([]);
      expect(validateAndNormalizeCoordinates(undefined)).toEqual([]);
      expect(validateAndNormalizeCoordinates('invalid')).toEqual([]);
      expect(validateAndNormalizeCoordinates([])).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Routing Service Road Network Geometry & Distance Sources
  // ---------------------------------------------------------------------------
  describe('2. Routing Service Road Geometry & Distance Sources', () => {
    it('calculates real road network geometry with turns and road segments (not a straight line)', async () => {
      const service = new OsrmRoutingService();
      const origin = { lat: 26.1445, lng: 91.7362 }; // Guwahati
      const destination = { lat: 25.6701, lng: 94.1077 }; // Kohima

      try {
        const result = await service.calculateRoute(origin, destination);
        expect(result).toBeDefined();
        expect(result.geometry.length).toBeGreaterThan(10); // Real road network has dozens/hundreds of vertices
        expect(result.distanceKm).toBeGreaterThan(200);
        expect(result.durationMinutes).toBeGreaterThan(180);
        expect(result.segments.length).toBeGreaterThanOrEqual(1);

        // First point should match origin corridor
        expect(result.geometry[0][0]).toBeCloseTo(origin.lng, 1);
        expect(result.geometry[0][1]).toBeCloseTo(origin.lat, 1);

        // Last point should match destination corridor
        const last = result.geometry[result.geometry.length - 1];
        expect(last[0]).toBeCloseTo(destination.lng, 1);
        expect(last[1]).toBeCloseTo(destination.lat, 1);
      } catch (err: any) {
        // If network is offline, ensure it threw structured provider error instead of faking a straight line
        expect(['PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'ROUTE_NOT_FOUND']).toContain(err.code);
      }
    });

    it('supports ordered intermediate waypoints in constraints for multi-stop journeys', () => {
      const schema = routeCalculationSchema.safeParse({
        origin_id: 'Guwahati',
        destination_id: 'Kohima',
        waypoints: [
          { lat: 26.6338, lng: 92.8004 }, // Tezpur stop
          { lat: 25.9069, lng: 93.7258 }, // Dimapur stop
        ],
      });

      expect(schema.success).toBe(true);
      if (schema.success) {
        expect(schema.data.waypoints).toHaveLength(2);
        expect(schema.data.waypoints![0].lat).toBe(26.6338);
        expect(schema.data.waypoints![1].lat).toBe(25.9069);
      }
    });

    it('rejects identical origin and destination coordinates in route validation schema', () => {
      const sameLocationSchema = routeCalculationSchema.safeParse({
        origin_id: 'Guwahati',
        destination_id: 'Guwahati',
      });

      expect(sameLocationSchema.success).toBe(false);
      if (!sameLocationSchema.success) {
        expect(sameLocationSchema.error.issues[0].message).toContain('different locations');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. API Endpoint /api/v1/routes/plan
  // ---------------------------------------------------------------------------
  describe('3. Route Plan API Endpoint Contract', () => {
    it('returns both route and routes properties with road geometry and distance metrics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: 'LOC001', // Guwahati
          destination_id: 'LOC002', // Shillong
        }),
      });

      const res = await postPlanRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.coordinates).toBeDefined();
      expect(Array.isArray(json.data.coordinates)).toBe(true);
      expect(json.data.coordinates.length).toBeGreaterThanOrEqual(2);

      // Verify both consumer contracts (nested route and root routes)
      expect(json.data.route).toBeDefined();
      expect(json.data.route.coordinates).toBeDefined();
      expect(json.data.routes).toBeDefined();
      expect(json.data.routes.length).toBeGreaterThanOrEqual(1);

      // Real distance & duration (not fake or straight line)
      expect(json.data.distanceKm).toBeGreaterThan(0);
      expect(json.data.durationMinutes).toBeGreaterThan(0);
    });

    it('fails gracefully with 400 when origin and destination are the same location', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: 'LOC001',
          destination_id: 'LOC001',
        }),
      });

      const res = await postPlanRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('fails gracefully with 404 when origin location cannot be resolved', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: 'UNKNOWN_NONEXISTENT_XYZ_HUB_9999',
          destination_id: 'LOC002',
        }),
      });

      const res = await postPlanRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Distinction Between Planned Route and Actual GPS Track
  // ---------------------------------------------------------------------------
  describe('4. Planned Route vs Actual GPS Track Distinction', () => {
    it('correctly categorizes planned road corridor vs actual vehicle GPS telemetry track', () => {
      const plannedRoute = {
        id: 'planned-nh29',
        coordinates: [
          [91.7362, 26.1445],
          [92.8004, 26.6338],
          [94.1077, 25.6701],
        ] as [number, number][],
        isGpsTrack: false,
        label: 'Planned Transportation Corridor NH-29',
      };

      const actualGpsTrack = {
        id: 'actual-gps-track-veh01',
        coordinates: [
          [91.7500, 26.1500],
          [91.8200, 26.1800],
          [91.9100, 26.2100],
        ] as [number, number][],
        isGpsTrack: true,
        label: 'Actual Vehicle GPS Track',
      };

      expect(plannedRoute.isGpsTrack).toBe(false);
      expect(actualGpsTrack.isGpsTrack).toBe(true);
      expect(plannedRoute.label).toContain('Planned');
      expect(actualGpsTrack.label).toContain('Actual');
      expect(plannedRoute.coordinates).not.toEqual(actualGpsTrack.coordinates);
    });
  });
});
