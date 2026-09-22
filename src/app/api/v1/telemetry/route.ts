import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { gpsPositionIngestSchema, gpsBatchIngestSchema, telemetryIngestSchema } from '@/lib/validation';
import { requirePermission } from '@/lib/auth/authorization';
import {
  ingestGpsPosition,
  ingestGpsBatch,
  getLatestVehicleGps,
  listLiveFleetGps,
  getVehicleGpsBreadcrumbs,
} from '@/lib/services/telemetry.service';
import { getTelemetryProvider } from '@/lib/providers/telemetry.provider';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'telemetry:read');
    const { searchParams } = new URL(request.url);

    const vehicleId = searchParams.get('vehicle_id');
    const tripId = searchParams.get('trip_id') || undefined;
    const history = searchParams.get('history') === 'true';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const since = searchParams.get('since') || undefined;

    const organizationId = user.organizationId;
    if (!organizationId && user.role !== 'SUPER_ADMIN') {
      return apiSuccess([]);
    }

    // 1. Single vehicle telemetry query
    if (vehicleId) {
      if (history) {
        // Return breadcrumbs trace
        const breadcrumbs = await getVehicleGpsBreadcrumbs(
          vehicleId,
          organizationId || '',
          { limit, since }
        );
        return apiSuccess(breadcrumbs, { count: breadcrumbs.length });
      }

      // Return single latest position
      const latest = await getLatestVehicleGps(vehicleId, organizationId || '');
      if (!latest.position) {
        // Zero fabrication: truthful null with offline/standby metadata
        return apiSuccess(null, {
          freshness: 'OFFLINE',
          message: 'No live telemetry recorded for this vehicle',
        });
      }

      return apiSuccess(latest.position, {
        freshness: latest.freshness,
        ageSeconds: latest.ageSeconds,
      });
    }

    // 2. Organization-wide live fleet telemetry radar
    const fleetStates = await listLiveFleetGps(organizationId || '', { tripId });
    return apiSuccess(fleetStates, { count: fleetStates.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'telemetry:write');
    const body = await request.json();

    const organizationId = user.organizationId;
    if (!organizationId && user.role !== 'SUPER_ADMIN') {
      return apiValidationError({
        issues: [{ path: ['organization_id'], message: 'Caller must belong to an organization' }],
      } as any);
    }

    // Check if this is a batch payload (e.g. from offline sync outbox)
    if (body && Array.isArray(body.positions)) {
      const parsedBatch = gpsBatchIngestSchema.safeParse(body);
      if (!parsedBatch.success) {
        return apiValidationError(parsedBatch.error);
      }

      const batchResult = await ingestGpsBatch(
        organizationId || '',
        parsedBatch.data.positions,
        user
      );

      return apiSuccess(batchResult, {
        message: `Successfully ingested ${batchResult.ingestedCount} GPS positions (${batchResult.skippedCount} skipped)`,
      });
    }

    // Single position payload: validate with gpsPositionIngestSchema
    const parsed = gpsPositionIngestSchema.safeParse(body);
    if (!parsed.success) {
      // Fall back to legacy schema validation for backward compatibility
      const legacyParsed = telemetryIngestSchema.safeParse(body);
      if (!legacyParsed.success) {
        return apiValidationError(parsed.error);
      }

      const pos = await ingestGpsPosition(
        organizationId || '',
        {
          vehicle_id: legacyParsed.data.vehicle_id,
          shipment_id: legacyParsed.data.shipment_id || null,
          trip_id: legacyParsed.data.trip_id || null,
          latitude: legacyParsed.data.latitude,
          longitude: legacyParsed.data.longitude,
          speed_kmh: legacyParsed.data.speed_kmh,
          heading_degrees: legacyParsed.data.heading_degrees,
          altitude_meters: legacyParsed.data.altitude_meters || null,
          accuracy_meters: legacyParsed.data.accuracy_meters || null,
          battery_pct: legacyParsed.data.battery_pct || null,
          recorded_at: legacyParsed.data.recorded_at,
          is_offline_cached: legacyParsed.data.is_offline_cached,
        },
        user
      );

      // Notify legacy provider cache
      try {
        const provider = getTelemetryProvider();
        await provider.emitTelemetry({
          vehicleId: pos.vehicleId,
          shipmentId: pos.tripId || 'shp-active',
          coordinates: pos.coordinates,
          speedKmh: pos.speedKmh,
          headingDegrees: pos.headingDegrees,
          altitudeMeters: pos.altitudeMeters || undefined,
          accuracyMeters: pos.accuracyMeters || undefined,
          timestamp: pos.recordedAt,
        });
      } catch {
        // Non-blocking legacy sync
      }

      return apiSuccess(pos, { message: 'GPS position successfully ingested' }, 200);
    }

    // Modern GPS position ingestion
    const pos = await ingestGpsPosition(
      organizationId || '',
      {
        vehicle_id: parsed.data.vehicle_id,
        trip_id: parsed.data.trip_id || null,
        shipment_id: parsed.data.shipment_id || null,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        speed_kmh: parsed.data.speed_kmh,
        heading_degrees: parsed.data.heading_degrees,
        altitude_meters: parsed.data.altitude_meters || null,
        accuracy_meters: parsed.data.accuracy_meters || null,
        battery_pct: parsed.data.battery_pct || null,
        recorded_at: parsed.data.recorded_at,
        is_offline_cached: parsed.data.is_offline_cached,
      },
      user
    );

    // Notify legacy provider cache
    try {
      const provider = getTelemetryProvider();
      await provider.emitTelemetry({
        vehicleId: pos.vehicleId,
        shipmentId: pos.tripId || 'shp-active',
        coordinates: pos.coordinates,
        speedKmh: pos.speedKmh,
        headingDegrees: pos.headingDegrees,
        altitudeMeters: pos.altitudeMeters || undefined,
        accuracyMeters: pos.accuracyMeters || undefined,
        timestamp: pos.recordedAt,
      });
    } catch {
      // Non-blocking
    }

    return apiSuccess(pos, { message: 'GPS position successfully ingested' }, 200);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
