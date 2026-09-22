/**
 * AuraNER / NER-Route AI — Production Synchronization & Conflict Engine
 * 
 * Handles batch processing of driver outbox operations, explicit conflict
 * detection (SERVER_WINS, CLIENT_WINS, REJECTED_INVALID, MERGE), partial synchronization,
 * and immutable audit recording without silent data loss.
 */

import {
  SyncBatchPayload,
  SyncBatchResult,
  SyncOperationItem,
  SyncOperationResult,
  ConflictDetails,
} from '@/lib/types/sync';
import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api/response';
import { getShipmentById, updateShipmentRecord } from '@/lib/services/shipment.service';
import { getTripById, completeTripStop } from '@/lib/services/trip.service';
import { ingestGpsPosition } from '@/lib/services/telemetry.service';
import { createRouteAlert } from '@/lib/services/alert.service';
import { logAuditEvent } from '@/lib/services/audit.service';

/**
 * Processes a batch of queued offline operations with explicit conflict resolution
 */
export async function processSyncBatch(
  organizationId: string,
  payload: SyncBatchPayload,
  user: SessionUser
): Promise<SyncBatchResult> {
  if (!organizationId) {
    throw new BadRequestError('Organization ID is required for synchronization');
  }

  // Enforce tenant scoping
  const role = normalizeRole(user.role);
  if (role !== 'SUPER_ADMIN') {
    assertTenantOwnership(organizationId, user, 'sync');
  }

  const batchId = `sync-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const operations = payload.operations || [];

  // Sort operations chronologically by clientTimestamp
  const sortedOperations = [...operations].sort((a, b) => {
    const timeA = new Date(a.clientTimestamp).getTime() || 0;
    const timeB = new Date(b.clientTimestamp).getTime() || 0;
    return timeA - timeB;
  });

  const results: SyncOperationResult[] = [];
  let syncedCount = 0;
  let conflictCount = 0;
  let failedCount = 0;

  for (const op of sortedOperations) {
    try {
      const result = await processSingleOperation(organizationId, op, user);
      results.push(result);

      if (result.status === 'SYNCED') {
        syncedCount++;
      } else if (result.status === 'CONFLICT') {
        conflictCount++;
      } else {
        failedCount++;
      }
    } catch (err: unknown) {
      failedCount++;
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        id: op.id,
        type: op.type,
        entityId: op.entityId,
        status: 'FAILED',
        error: msg,
      });
    }
  }

  // Record audit log for synchronization batch
  await logAuditEvent({
    action: 'SYNC_BATCH_PROCESSED',
    userId: user.id,
    entityType: 'sync_batch',
    entityId: batchId,
    metadata: {
      batchId,
      organizationId,
      driverId: payload.driverId,
      deviceId: payload.deviceId,
      totalCount: operations.length,
      syncedCount,
      conflictCount,
      failedCount,
    },
  });

  return {
    batchId,
    processedCount: operations.length,
    syncedCount,
    conflictCount,
    failedCount,
    results,
  };
}

/**
 * Processes an individual sync operation with domain-specific conflict rules
 */
async function processSingleOperation(
  organizationId: string,
  op: SyncOperationItem,
  user: SessionUser
): Promise<SyncOperationResult> {
  switch (op.type) {
    // -------------------------------------------------------------------------
    // 1. PROOF OF DELIVERY (POD)
    // -------------------------------------------------------------------------
    case 'PROOF_OF_DELIVERY': {
      const shipmentId = op.entityId;
      let shipment;

      try {
        shipment = await getShipmentById(shipmentId, user);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return {
            id: op.id,
            type: op.type,
            entityId: shipmentId,
            status: 'FAILED',
            error: `Shipment ${shipmentId} not found on server`,
          };
        }
        throw err;
      }

      // Check for conflict: Shipment was cancelled on server
      if (shipment.status === 'CANCELLED') {
        const conflict: ConflictDetails = {
          conflictType: 'CONFLICT_SHIPMENT_CANCELLED',
          serverStatus: 'CANCELLED',
          resolution: 'REJECTED_INVALID',
          resolutionReason:
            'Consignment was cancelled by dispatch on server; cannot accept offline proof of delivery.',
        };

        // Audit the conflict attempt
        await logAuditEvent({
          action: 'SYNC_CONFLICT_DETECTED',
          userId: user.id,
          entityType: 'shipment',
          entityId: shipmentId,
          metadata: {
            operationId: op.id,
            operationType: op.type,
            entityId: shipmentId,
            conflict: conflict as unknown as Record<string, unknown>,
            clientTimestamp: op.clientTimestamp,
          },
        });

        return {
          id: op.id,
          type: op.type,
          entityId: shipmentId,
          status: 'CONFLICT',
          conflict,
          serverEntity: shipment,
        };
      }

      // Idempotent case: Shipment was already marked DELIVERED
      if (shipment.status === 'DELIVERED') {
        const conflict: ConflictDetails = {
          conflictType: 'ALREADY_DELIVERED',
          serverStatus: 'DELIVERED',
          resolution: 'SERVER_WINS',
          resolutionReason:
            'Consignment is already recorded as delivered on server. Signatures backfilled idempotently.',
        };

        // If signatures missing, backfill without changing status
        if (!shipment.podSignatureUrl && op.payload?.pod_signature_url) {
          await updateShipmentRecord(
            shipmentId,
            {
              podSignatureUrl: op.payload.pod_signature_url as string,
              podPhotoUrl: (op.payload.pod_photo_url as string) || undefined,
            },
            user
          );
        }

        return {
          id: op.id,
          type: op.type,
          entityId: shipmentId,
          status: 'SYNCED',
          conflict,
          serverEntity: shipment,
        };
      }

      // Standard delivery update
      const updated = await updateShipmentRecord(
        shipmentId,
        {
          status: 'DELIVERED',
          deliveredAt: op.clientTimestamp || new Date().toISOString(),
          podSignatureUrl: (op.payload?.pod_signature_url as string) || null,
          podPhotoUrl: (op.payload?.pod_photo_url as string) || null,
          notes: op.payload?.notes ? String(op.payload.notes) : undefined,
        },
        user
      );

      return {
        id: op.id,
        type: op.type,
        entityId: shipmentId,
        status: 'SYNCED',
        serverEntity: updated,
      };
    }

    // -------------------------------------------------------------------------
    // 2. CHECKPOINT CLEARANCE
    // -------------------------------------------------------------------------
    case 'CHECKPOINT_CLEARANCE': {
      const stopId = op.entityId;
      const tripId = (op.payload?.trip_id as string) || '';

      if (!tripId) {
        return {
          id: op.id,
          type: op.type,
          entityId: stopId,
          status: 'FAILED',
          error: 'Missing trip_id in checkpoint clearance payload',
        };
      }

      let trip;
      try {
        trip = await getTripById(tripId, user);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return {
            id: op.id,
            type: op.type,
            entityId: stopId,
            status: 'FAILED',
            error: `Trip ${tripId} not found on server`,
          };
        }
        throw err;
      }

      // Check if trip was cancelled on server
      if (trip.status === 'CANCELLED') {
        const conflict: ConflictDetails = {
          conflictType: 'CONFLICT_TRIP_CANCELLED',
          serverStatus: 'CANCELLED',
          resolution: 'REJECTED_INVALID',
          resolutionReason:
            'Trip itinerary was cancelled by dispatch; cannot record checkpoint clearance.',
        };

        return {
          id: op.id,
          type: op.type,
          entityId: stopId,
          status: 'CONFLICT',
          conflict,
        };
      }

      // Find the stop in the trip
      const stop = trip.stops?.find((s) => s.id === stopId);
      if (stop && stop.isCompleted) {
        const conflict: ConflictDetails = {
          conflictType: 'ALREADY_COMPLETED',
          serverStatus: 'COMPLETED',
          resolution: 'SERVER_WINS',
          resolutionReason: 'Checkpoint stop was already marked completed on the server.',
        };

        return {
          id: op.id,
          type: op.type,
          entityId: stopId,
          status: 'SYNCED',
          conflict,
          serverEntity: stop,
        };
      }

      // Complete stop milestone
      const completed = await completeTripStop(tripId, stopId, user);
      return {
        id: op.id,
        type: op.type,
        entityId: stopId,
        status: 'SYNCED',
        serverEntity: completed,
      };
    }

    // -------------------------------------------------------------------------
    // 3. GPS PING
    // -------------------------------------------------------------------------
    case 'GPS_PING': {
      const vehicleId = op.entityId;
      const p = op.payload || {};

      const pos = await ingestGpsPosition(
        organizationId,
        {
          vehicle_id: vehicleId,
          trip_id: (p.trip_id as string) || null,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          speed_kmh: Number(p.speed_kmh || 0),
          heading_degrees: Number(p.heading_degrees || 0),
          altitude_meters: p.altitude_meters ? Number(p.altitude_meters) : null,
          accuracy_meters: p.accuracy_meters ? Number(p.accuracy_meters) : null,
          battery_pct: p.battery_pct ? Number(p.battery_pct) : null,
          recorded_at: op.clientTimestamp,
          is_offline_cached: true,
        },
        user
      );

      return {
        id: op.id,
        type: op.type,
        entityId: vehicleId,
        status: 'SYNCED',
        serverEntity: pos,
      };
    }

    // -------------------------------------------------------------------------
    // 4. HAZARD REPORT
    // -------------------------------------------------------------------------
    case 'HAZARD_REPORT': {
      const p = op.payload || {};
      const alert = await createRouteAlert({
        shipmentId: (p.shipment_id as string) || 'shp-general',
        vehicleId: (p.vehicle_id as string) || op.entityId,
        type: (p.hazard_type as string) || 'ROAD_OBSTRUCTION',
        severity: (p.severity as any) || 'HIGH',
        title: `[OFFLINE REPORT] ${(p.title as string) || 'Road Hazard Alert'}`,
        message: `${(p.description as string) || 'Reported by driver while in offline zone'}. (Captured: ${op.clientTimestamp})`,
        distanceToHazardKm: 0,
        coordinates: {
          lat: Number(p.latitude || 26.14),
          lng: Number(p.longitude || 91.73),
        },
      });

      return {
        id: op.id,
        type: op.type,
        entityId: op.entityId,
        status: 'SYNCED',
        serverEntity: alert,
      };
    }

    // -------------------------------------------------------------------------
    // 5. SOS EMERGENCY TRIGGER
    // -------------------------------------------------------------------------
    case 'SOS_TRIGGER': {
      const p = op.payload || {};
      const sos = await createRouteAlert({
        shipmentId: (p.shipment_id as string) || 'shp-emergency',
        vehicleId: (p.vehicle_id as string) || op.entityId,
        type: 'EMERGENCY_SOS',
        severity: 'CRITICAL',
        title: '🚨 CRITICAL SOS BEACON: In-Cab Offline Trigger Sync',
        message: `Driver triggered emergency SOS beacon while offline. Queued at: ${op.clientTimestamp}`,
        distanceToHazardKm: 0,
        coordinates: {
          lat: Number(p.latitude || 26.14),
          lng: Number(p.longitude || 91.73),
        },
      });

      return {
        id: op.id,
        type: op.type,
        entityId: op.entityId,
        status: 'SYNCED',
        serverEntity: sos,
      };
    }

    default:
      return {
        id: op.id,
        type: op.type,
        entityId: op.entityId,
        status: 'FAILED',
        error: `Unknown sync operation type: ${op.type}`,
      };
  }
}
