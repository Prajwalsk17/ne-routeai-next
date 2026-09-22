import { getServiceSupabase } from '@/lib/db/supabase';

export interface AuditLogEntry {
  id?: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

const localAuditEntries: AuditLogEntry[] = [];

export function getLocalAuditEntries(): AuditLogEntry[] {
  return [...localAuditEntries];
}

/**
 * Records an immutable audit log entry.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();
  const metadata = entry.metadata || {};

  // 1. Supabase Audit Log Table
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: entry.userId || null,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId || null,
        metadata,
        created_at: timestamp,
      });
      return;
    } catch (err) {
      console.error('Failed to persist audit log to Supabase:', err);
    }
  }

  // 2. Local fallback storage
  localAuditEntries.push({
    ...entry,
    createdAt: timestamp,
    metadata,
  });
}

/**
 * Specialized audit helpers for critical logistics milestones
 */
export async function logShipmentCreated(
  shipmentId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_CREATED',
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: details,
  });
}

export async function logShipmentDispatched(
  shipmentId: string,
  userId: string | null,
  vehicleId: string,
  driverId: string,
  routeId: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_DISPATCHED',
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: { vehicleId, driverId, routeId },
  });
}

export async function logRouteRecalculated(
  shipmentId: string,
  oldRouteId: string | null,
  newRouteId: string,
  reason: string,
  hazardId?: string
): Promise<void> {
  return logAuditEvent({
    action: 'ROUTE_RECALCULATED',
    entityType: 'route',
    entityId: newRouteId,
    metadata: {
      shipmentId,
      oldRouteId,
      newRouteId,
      reason,
      hazardId,
      triggeredBy: 'AI_DYNAMIC_RISK_MONITOR',
    },
  });
}

export async function logAlertAcknowledged(
  alertId: string,
  userId: string | null,
  action: string,
  notes?: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: `ALERT_${action}`,
    entityType: 'alert',
    entityId: alertId,
    metadata: { notes },
  });
}

// -----------------------------------------------------------------------------
// FLEET & DRIVER AUDIT LOGGING HELPERS
// -----------------------------------------------------------------------------

export async function logVehicleCreated(
  vehicleId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'VEHICLE_CREATED',
    entityType: 'vehicle',
    entityId: vehicleId,
    metadata: details,
  });
}

export async function logVehicleUpdated(
  vehicleId: string,
  userId: string | null,
  changes: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'VEHICLE_UPDATED',
    entityType: 'vehicle',
    entityId: vehicleId,
    metadata: changes,
  });
}

export async function logVehicleArchived(
  vehicleId: string,
  userId: string | null,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'VEHICLE_ARCHIVED',
    entityType: 'vehicle',
    entityId: vehicleId,
    metadata: { reason: reason || 'Decommissioned by fleet operator' },
  });
}

export async function logVehicleMaintenanceLogged(
  vehicleId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'VEHICLE_MAINTENANCE_LOGGED',
    entityType: 'vehicle_maintenance',
    entityId: vehicleId,
    metadata: details,
  });
}

export async function logVehicleDocumentRecorded(
  vehicleId: string,
  userId: string | null,
  docDetails: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'VEHICLE_DOCUMENT_RECORDED',
    entityType: 'vehicle_document',
    entityId: vehicleId,
    metadata: docDetails,
  });
}

export async function logDriverOnboarded(
  driverId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'DRIVER_ONBOARDED',
    entityType: 'driver',
    entityId: driverId,
    metadata: details,
  });
}

export async function logDriverUpdated(
  driverId: string,
  userId: string | null,
  changes: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'DRIVER_UPDATED',
    entityType: 'driver',
    entityId: driverId,
    metadata: changes,
  });
}

export async function logDriverArchived(
  driverId: string,
  userId: string | null,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'DRIVER_ARCHIVED',
    entityType: 'driver',
    entityId: driverId,
    metadata: { reason: reason || 'Deactivated / suspended by manager' },
  });
}

export async function logDriverDocumentRecorded(
  driverId: string,
  userId: string | null,
  docDetails: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'DRIVER_DOCUMENT_RECORDED',
    entityType: 'driver_document',
    entityId: driverId,
    metadata: docDetails,
  });
}

// -----------------------------------------------------------------------------
// SHIPMENT & TRIP AUDIT LOGGING HELPERS
// -----------------------------------------------------------------------------

export async function logShipmentUpdated(
  shipmentId: string,
  userId: string | null,
  changes: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_UPDATED',
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: changes,
  });
}

export async function logShipmentCancelled(
  shipmentId: string,
  userId: string | null,
  reason?: string
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_CANCELLED',
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: { reason: reason || 'Cancelled by operator' },
  });
}

export async function logShipmentDelivered(
  shipmentId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_DELIVERED',
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: details,
  });
}

export async function logShipmentItemAdded(
  shipmentId: string,
  userId: string | null,
  itemDetails: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'SHIPMENT_ITEM_ADDED',
    entityType: 'shipment_item',
    entityId: shipmentId,
    metadata: itemDetails,
  });
}

export async function logTripCreated(
  tripId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'TRIP_CREATED',
    entityType: 'trip',
    entityId: tripId,
    metadata: details,
  });
}

export async function logTripStatusUpdated(
  tripId: string,
  userId: string | null,
  changes: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'TRIP_STATUS_UPDATED',
    entityType: 'trip',
    entityId: tripId,
    metadata: changes,
  });
}

export async function logTripStopCompleted(
  tripId: string,
  stopId: string,
  userId: string | null,
  stopDetails: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'TRIP_STOP_COMPLETED',
    entityType: 'trip_stop',
    entityId: `${tripId}:${stopId}`,
    metadata: stopDetails,
  });
}

export async function logTripAssignmentCreated(
  tripId: string,
  shipmentId: string,
  userId: string | null
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'TRIP_ASSIGNMENT_CREATED',
    entityType: 'trip_assignment',
    entityId: `${tripId}:${shipmentId}`,
    metadata: { tripId, shipmentId },
  });
}

export async function logRouteSaved(
  routeId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'ROUTE_SAVED',
    entityType: 'route',
    entityId: routeId,
    metadata: details,
  });
}

export async function logRouteVersionCreated(
  routeId: string,
  versionId: string,
  userId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  return logAuditEvent({
    userId,
    action: 'ROUTE_VERSION_CREATED',
    entityType: 'route_version',
    entityId: `${routeId}:${versionId}`,
    metadata: details,
  });
}

/**
 * Retrieves audit history for an entity
 */
export async function getAuditHistory(entityType?: string, entityId?: string) {
  const supabase = getServiceSupabase();
  if (supabase) {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data, error } = await query;
    if (!error && data) return data;
  }

  // Fallback to local logs
  return getLocalAuditEntries();
}

export const getDecisionLogs = getLocalAuditEntries;
