/**
 * AuraNER / NER-Route AI — Production Telemetry & GPS Tracking Service
 * 
 * Manages live GPS position ingestion, high-frequency telemetry caching,
 * temporal freshness tracking (LIVE, DEGRADED, STALE, OFFLINE),
 * trip lifecycle auto-advancement, and multi-tenant isolation.
 */

import { randomUUID } from 'crypto';
import {
  GpsPosition,
  GpsPositionInput,
  GpsVehicleState,
  GpsFreshnessStatus,
  GpsBatchIngestResult,
} from '@/lib/types/telemetry';

export type { GpsPosition };
import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import { NotFoundError, BadRequestError, ForbiddenError } from '@/lib/api/response';
import { getVehicleById, updateVehicle, listVehicles } from '@/lib/services/fleet.service';
import { getTripById, updateTripRecord } from '@/lib/services/trip.service';
import { getShipmentById, updateShipmentRecord } from '@/lib/services/shipment.service';
import { getServiceSupabase } from '@/lib/db/supabase';

// In-memory telemetry stores
const localPositionsStore = new Map<string, GpsPosition>();
const latestPositionByVehicle = new Map<string, GpsPosition>();

// Pub-sub listeners for real-time SSE streaming keyed by organizationId
type TelemetryListener = (position: GpsPosition) => void;
const organizationListeners = new Map<string, Set<TelemetryListener>>();

/**
 * Calculates GPS temporal freshness status based on timestamp age
 */
export function calculateGpsFreshness(recordedAtStr?: string | null): {
  status: GpsFreshnessStatus;
  ageSeconds: number;
} {
  if (!recordedAtStr) {
    return { status: 'OFFLINE', ageSeconds: Infinity };
  }

  const recordedTime = new Date(recordedAtStr).getTime();
  if (isNaN(recordedTime)) {
    return { status: 'OFFLINE', ageSeconds: Infinity };
  }

  const now = Date.now();
  const ageSeconds = Math.max(0, Math.floor((now - recordedTime) / 1000));

  if (ageSeconds < 30) {
    return { status: 'LIVE', ageSeconds };
  } else if (ageSeconds < 120) {
    return { status: 'DEGRADED', ageSeconds };
  } else if (ageSeconds < 600) {
    return { status: 'STALE', ageSeconds };
  } else {
    return { status: 'OFFLINE', ageSeconds };
  }
}

/**
 * Ingests a single real GPS position ping with strict multi-tenant validation
 */
export async function ingestGpsPosition(
  organizationId: string,
  input: GpsPositionInput,
  user?: SessionUser
): Promise<GpsPosition> {
  if (!organizationId) {
    throw new BadRequestError('Organization ID is required to ingest telemetry');
  }

  // 1. Verify caller authorization if user session provided
  if (user) {
    const role = normalizeRole(user.role);
    if (role !== 'SUPER_ADMIN') {
      assertTenantOwnership(organizationId, user, 'telemetry');
    }
  }

  // 2. Validate vehicle ownership within tenant
  const systemWorkerUser: SessionUser = user || {
    id: 'system_telemetry_service',
    email: 'system@auraner.internal',
    name: 'System Telemetry',
    role: 'SUPER_ADMIN',
    organizationId,
  };

  const vehicle = await getVehicleById(input.vehicle_id, systemWorkerUser);
  if (!vehicle) {
    throw new NotFoundError(`Vehicle with ID ${input.vehicle_id} not found`);
  }

  if (vehicle.organizationId !== organizationId) {
    throw new ForbiddenError(
      `Tenant access denied. Vehicle ${input.vehicle_id} belongs to a different organization.`
    );
  }

  // 3. Validate trip association if trip_id is specified
  let trip = null;
  if (input.trip_id) {
    trip = await getTripById(input.trip_id, systemWorkerUser);
    if (trip) {
      if (trip.organizationId !== organizationId) {
        throw new ForbiddenError(
          `Tenant access denied. Trip ${input.trip_id} belongs to a different organization.`
        );
      }
      if (trip.vehicleId !== input.vehicle_id) {
        throw new BadRequestError(
          `Trip ${input.trip_id} is assigned to vehicle ${trip.vehicleId}, not ${input.vehicle_id}.`
        );
      }
    }
  }

  // 4. Validate Coordinates Sanity
  if (input.latitude < -90 || input.latitude > 90) {
    throw new BadRequestError(`Invalid latitude ${input.latitude}. Must be between -90 and 90.`);
  }
  if (input.longitude < -180 || input.longitude > 180) {
    throw new BadRequestError(`Invalid longitude ${input.longitude}. Must be between -180 and 180.`);
  }
  if (input.speed_kmh !== undefined && input.speed_kmh < 0) {
    throw new BadRequestError(`Invalid speed ${input.speed_kmh}. Speed cannot be negative.`);
  }

  // 5. Timestamp validation
  const now = new Date();
  const recordedAtDate = input.recorded_at ? new Date(input.recorded_at) : now;
  if (isNaN(recordedAtDate.getTime())) {
    throw new BadRequestError(`Invalid recorded_at timestamp: ${input.recorded_at}`);
  }

  // Disallow future timestamps > 5 minutes in future
  if (recordedAtDate.getTime() > now.getTime() + 5 * 60 * 1000) {
    throw new BadRequestError('Timestamp cannot be more than 5 minutes in the future');
  }
  // Disallow ancient timestamps > 7 days
  if (recordedAtDate.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
    throw new BadRequestError('Timestamp cannot be older than 7 days');
  }

  const recordedAtIso = recordedAtDate.toISOString();
  const positionId = `pos-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const position: GpsPosition = {
    id: positionId,
    vehicleId: input.vehicle_id,
    tripId: input.trip_id || (trip ? trip.id : null),
    driverId: trip ? trip.driverId : null,
    organizationId,
    coordinates: {
      lat: input.latitude,
      lng: input.longitude,
    },
    speedKmh: Math.max(0, input.speed_kmh || 0),
    headingDegrees: Math.max(0, Math.min(360, input.heading_degrees || 0)),
    altitudeMeters: input.altitude_meters !== undefined ? input.altitude_meters : null,
    accuracyMeters: input.accuracy_meters !== undefined ? input.accuracy_meters : null,
    batteryPct: input.battery_pct !== undefined ? input.battery_pct : null,
    isOfflineCached: Boolean(input.is_offline_cached),
    recordedAt: recordedAtIso,
    createdAt: now.toISOString(),
  };

  // 6. Cache in memory
  localPositionsStore.set(positionId, position);
  
  // Update latest position if newer than existing latest
  const existingLatest = latestPositionByVehicle.get(input.vehicle_id);
  if (!existingLatest || new Date(position.recordedAt).getTime() >= new Date(existingLatest.recordedAt).getTime()) {
    latestPositionByVehicle.set(input.vehicle_id, position);
  }

  // 7. Auto-advance trip status if currently SCHEDULED or DISPATCHED
  if (trip && (trip.status === 'SCHEDULED' || (trip.status as string) === 'DISPATCHED')) {
    try {
      await updateTripRecord(
        trip.id,
        {
          status: 'EN_ROUTE',
        },
        systemWorkerUser
      );
    } catch (err) {
      console.warn(`Could not auto-advance trip ${trip.id} status:`, err);
    }
  }

  // 8. Auto-advance linked shipment status to IN_TRANSIT if currently DISPATCHED
  if (trip && trip.assignedShipmentIds && trip.assignedShipmentIds.length > 0) {
    for (const shpId of trip.assignedShipmentIds) {
      try {
        const shp = await getShipmentById(shpId, systemWorkerUser);
        if (shp && (shp.status === 'DISPATCHED' || shp.status === 'ASSIGNED')) {
          await updateShipmentRecord(
            shpId,
            {
              status: 'IN_TRANSIT',
              actualDeparture: recordedAtIso,
            },
            systemWorkerUser
          );
        }
      } catch (err) {
        console.warn(`Could not auto-advance shipment ${shpId} status:`, err);
      }
    }
  }

  // 9. Asynchronously update Supabase if configured
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('gps_positions').insert({
        id: position.id,
        vehicle_id: position.vehicleId,
        trip_id: position.tripId,
        coordinates: `POINT(${position.coordinates.lng} ${position.coordinates.lat})`,
        speed_kmh: position.speedKmh,
        heading_degrees: position.headingDegrees,
        altitude_meters: position.altitudeMeters,
        accuracy_meters: position.accuracyMeters,
        battery_pct: position.batteryPct,
        recorded_at: position.recordedAt,
      });

      // Update vehicles.current_location and last_telemetry_at
      await supabase
        .from('vehicles')
        .update({
          current_location: `POINT(${position.coordinates.lng} ${position.coordinates.lat})`,
          last_telemetry_at: position.recordedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.vehicleId);
    } catch (err) {
      console.warn('Supabase gps_positions persistence error:', err);
    }
  }

  // 10. Broadcast to real-time subscribers
  emitToOrganizationListeners(organizationId, position);

  return position;
}

/**
 * Ingests a chronological batch of GPS positions (e.g. from offline mobile sync outbox)
 */
export async function ingestGpsBatch(
  organizationId: string,
  positions: GpsPositionInput[],
  user?: SessionUser
): Promise<GpsBatchIngestResult> {
  if (!positions || positions.length === 0) {
    return { ingestedCount: 0, skippedCount: 0, latestPosition: null };
  }

  // Sort chronologically ascending
  const sorted = [...positions].sort((a, b) => {
    const timeA = a.recorded_at ? new Date(a.recorded_at).getTime() : 0;
    const timeB = b.recorded_at ? new Date(b.recorded_at).getTime() : 0;
    return timeA - timeB;
  });

  let ingestedCount = 0;
  let skippedCount = 0;
  let latest: GpsPosition | null = null;
  const errors: string[] = [];

  for (const posInput of sorted) {
    try {
      const ingested = await ingestGpsPosition(organizationId, posInput, user);
      latest = ingested;
      ingestedCount++;
    } catch (err: unknown) {
      skippedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Point at ${posInput.recorded_at || 'now'}: ${msg}`);
    }
  }

  return {
    ingestedCount,
    skippedCount,
    latestPosition: latest,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Retrieves the latest real GPS position for a vehicle with organization isolation
 */
export async function getLatestVehicleGps(
  vehicleId: string,
  organizationId: string
): Promise<{ position: GpsPosition | null; freshness: GpsFreshnessStatus; ageSeconds: number }> {
  // Check in-memory store
  const cached = latestPositionByVehicle.get(vehicleId);

  if (cached) {
    if (cached.organizationId !== organizationId) {
      return { position: null, freshness: 'OFFLINE', ageSeconds: Infinity };
    }
    const freshness = calculateGpsFreshness(cached.recordedAt);
    return {
      position: cached,
      freshness: freshness.status,
      ageSeconds: freshness.ageSeconds,
    };
  }

  // No telemetry found: Return null without fabrication
  return {
    position: null,
    freshness: 'OFFLINE',
    ageSeconds: Infinity,
  };
}

/**
 * Lists the current live GPS status for all vehicles belonging to the organization
 */
export async function listLiveFleetGps(
  organizationId: string,
  options?: { tripId?: string; freshness?: GpsFreshnessStatus }
): Promise<GpsVehicleState[]> {
  const systemUser: SessionUser = {
    id: 'system_telemetry_list',
    email: 'system@auraner.internal',
    name: 'System Telemetry',
    role: 'SUPER_ADMIN',
    organizationId,
  };

  // Get all active vehicles for the organization
  const { vehicles } = await listVehicles({ include_archived: false, limit: 100 }, systemUser);
  const orgVehicles = vehicles.filter((v) => v.organizationId === organizationId);

  const results: GpsVehicleState[] = [];

  for (const v of orgVehicles) {
    const latest = latestPositionByVehicle.get(v.id) || null;
    const { status: freshness, ageSeconds } = calculateGpsFreshness(latest?.recordedAt);

    if (options?.freshness && freshness !== options.freshness) {
      continue;
    }

    if (options?.tripId && latest?.tripId !== options.tripId) {
      continue;
    }

    results.push({
      vehicleId: v.id,
      registrationNumber: v.registrationNumber,
      makeModel: v.makeModel,
      vehicleType: v.type,
      organizationId: v.organizationId,
      driverId: latest?.driverId || null,
      driverName: null,
      tripId: latest?.tripId || null,
      tripCode: null,
      latestPosition: latest,
      freshness,
      staleDurationSeconds: ageSeconds,
      lastHeartbeatAt: latest?.recordedAt || null,
    });
  }

  return results;
}

/**
 * Retrieves chronological GPS coordinate breadcrumbs for route playback
 */
export async function getVehicleGpsBreadcrumbs(
  vehicleId: string,
  organizationId: string,
  options?: { limit?: number; since?: string }
): Promise<GpsPosition[]> {
  const limit = options?.limit || 100;
  const sinceTime = options?.since ? new Date(options.since).getTime() : 0;

  const positions = Array.from(localPositionsStore.values())
    .filter((p) => {
      if (p.vehicleId !== vehicleId) return false;
      if (p.organizationId !== organizationId) return false;
      if (sinceTime && new Date(p.recordedAt).getTime() <= sinceTime) return false;
      return true;
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .slice(-limit);

  return positions;
}

/**
 * Subscribes a listener to live telemetry events for a specific organization (SSE)
 */
export function subscribeToTelemetry(
  organizationId: string,
  listener: TelemetryListener
): () => void {
  let listeners = organizationListeners.get(organizationId);
  if (!listeners) {
    listeners = new Set<TelemetryListener>();
    organizationListeners.set(organizationId, listeners);
  }

  listeners.add(listener);

  // Return unsubscribe cleanup function
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      organizationListeners.delete(organizationId);
    }
  };
}

function emitToOrganizationListeners(organizationId: string, position: GpsPosition): void {
  const listeners = organizationListeners.get(organizationId);
  if (listeners) {
    Array.from(listeners).forEach((listener) => {
      try {
        listener(position);
      } catch (err) {
        console.error('Error invoking telemetry listener:', err);
      }
    });
  }
}

/**
 * Resets in-memory telemetry store for deterministic unit/integration test isolation
 */
export function _resetTelemetryStore(): void {
  localPositionsStore.clear();
  latestPositionByVehicle.clear();
  organizationListeners.clear();
}
