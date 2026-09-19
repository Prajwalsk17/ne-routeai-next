import { getServiceSupabase } from '@/lib/db/supabase';
import { logDecision, getDecisionLogs } from '@/lib/db';

export interface AuditLogEntry {
  id?: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
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
  try {
    const serializedReason = JSON.stringify({
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata,
      timestamp,
      userId: entry.userId,
    });
    logDecision(entry.action, serializedReason);
  } catch (err) {
    console.error('Failed to log audit event locally:', err);
  }
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
  return getDecisionLogs();
}
