import { getServiceSupabase } from '@/lib/db/supabase';
import { getNotificationProvider } from '@/lib/providers/notification.provider';
import { logAlertAcknowledged, logAuditEvent } from '@/lib/services/audit.service';
import { Coordinates } from '@/lib/providers/types';
import { SeverityLevel } from '@/lib/services/risk.service';

export type AlertStatus =
  | 'SENT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'DISMISSED';

export interface RouteAlertRecord {
  id: string;
  alertCode: string;
  shipmentId?: string;
  vehicleId?: string;
  driverId?: string;
  incidentId?: string;
  type: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  distanceToHazardKm?: number;
  coordinates?: Coordinates;
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
}

// In-memory alert store fallback for local execution
const localAlertStore = new Map<string, RouteAlertRecord>();

export async function createRouteAlert(payload: {
  shipmentId: string;
  vehicleId: string;
  driverId?: string;
  incidentId?: string;
  type: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  distanceToHazardKm?: number;
  coordinates?: Coordinates;
}): Promise<RouteAlertRecord> {
  const alertId = `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const alertCode = `ALT-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const record: RouteAlertRecord = {
    id: alertId,
    alertCode,
    shipmentId: payload.shipmentId,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    incidentId: payload.incidentId,
    type: payload.type,
    severity: payload.severity,
    title: payload.title,
    message: payload.message,
    distanceToHazardKm: payload.distanceToHazardKm,
    coordinates: payload.coordinates,
    status: 'SENT',
    createdAt: now,
  };

  // 1. Cache in memory
  localAlertStore.set(alertId, record);

  // 2. Persist to Supabase if connected
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('alerts').insert({
        id: alertId,
        alert_code: alertCode,
        shipment_id: payload.shipmentId,
        vehicle_id: payload.vehicleId,
        driver_id: payload.driverId || null,
        incident_id: payload.incidentId || null,
        type: payload.type,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        distance_to_hazard_km: payload.distanceToHazardKm || null,
        status: 'SENT',
        created_at: now,
      });
    } catch (err) {
      console.error('Failed to insert alert into Supabase:', err);
    }
  }

  // 3. Dispatch multi-channel notification
  const notifications = getNotificationProvider();
  await notifications.send({
    recipient: payload.driverId || payload.vehicleId,
    channel: payload.severity === 'CRITICAL' ? 'PUSH' : 'IN_APP',
    title: `⚠ ${payload.severity} ALERT: ${payload.title}`,
    body: `${payload.message} (${payload.distanceToHazardKm} km ahead)`,
    priority: payload.severity,
    metadata: {
      alertId,
      shipmentId: payload.shipmentId,
      vehicleId: payload.vehicleId,
      distanceToHazardKm: payload.distanceToHazardKm,
    },
  });

  // 4. Log audit trail
  await logAuditEvent({
    action: 'ALERT_CREATED',
    entityType: 'alert',
    entityId: alertId,
    metadata: {
      severity: payload.severity,
      hazardType: payload.type,
      shipmentId: payload.shipmentId,
      distanceKm: payload.distanceToHazardKm,
    },
  });

  return record;
}

export async function acknowledgeRouteAlert(
  alertId: string,
  userId: string | null,
  action: 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE' | 'DISMISS' = 'ACKNOWLEDGE',
  notes?: string
): Promise<RouteAlertRecord | null> {
  const now = new Date().toISOString();
  let alert = localAlertStore.get(alertId);

  const newStatus: AlertStatus =
    action === 'ACKNOWLEDGE'
      ? 'ACKNOWLEDGED'
      : action === 'ESCALATE'
      ? 'ESCALATED'
      : action === 'RESOLVE'
      ? 'RESOLVED'
      : 'DISMISSED';

  if (alert) {
    alert.status = newStatus;
    if (newStatus === 'ACKNOWLEDGED') alert.acknowledgedAt = now;
    if (newStatus === 'ESCALATED') alert.escalatedAt = now;
    if (newStatus === 'RESOLVED') alert.resolvedAt = now;
    localAlertStore.set(alertId, alert);
  }

  // Update Supabase
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'ACKNOWLEDGED') updates.acknowledged_at = now;
      if (newStatus === 'ESCALATED') updates.escalated_at = now;
      if (newStatus === 'RESOLVED') updates.resolved_at = now;

      await supabase.from('alerts').update(updates).eq('id', alertId);
    } catch (err) {
      console.error('Failed to update alert in Supabase:', err);
    }
  }

  // Record audit
  await logAlertAcknowledged(alertId, userId, action, notes);

  return alert || null;
}

export async function getActiveAlertsForShipment(shipmentId?: string): Promise<RouteAlertRecord[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      let query = supabase.from('alerts').select('*').order('created_at', { ascending: false });
      if (shipmentId) query = query.eq('shipment_id', shipmentId);
      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          alertCode: d.alert_code,
          shipmentId: d.shipment_id,
          vehicleId: d.vehicle_id,
          driverId: d.driver_id,
          incidentId: d.incident_id,
          type: d.type,
          severity: d.severity,
          title: d.title,
          message: d.message,
          distanceToHazardKm: d.distance_to_hazard_km,
          status: d.status,
          createdAt: d.created_at,
          acknowledgedAt: d.acknowledged_at,
          escalatedAt: d.escalated_at,
          resolvedAt: d.resolved_at,
        }));
      }
    } catch {
      // Fall through to memory store
    }
  }

  const allAlerts = Array.from(localAlertStore.values());
  if (shipmentId) {
    return allAlerts.filter((a) => a.shipmentId === shipmentId);
  }
  return allAlerts;
}
