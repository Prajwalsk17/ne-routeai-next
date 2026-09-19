import { getServiceSupabase } from '@/lib/db/supabase';
import {
  logShipmentCreated,
  logShipmentDispatched,
  logAuditEvent,
} from '@/lib/services/audit.service';
import { getNotificationProvider } from '@/lib/providers/notification.provider';

export type ShipmentStatus =
  | 'DRAFT'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELAYED'
  | 'REROUTING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ShipmentRecord {
  id: string;
  shipmentCode: string;
  originId: string;
  destinationId: string;
  cargoType: string;
  cargoWeightKg: number;
  cargoVolumeM3: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: ShipmentStatus;
  assignedVehicleId?: string | null;
  assignedDriverId?: string | null;
  activeRouteId?: string | null;
  dispatcherId?: string | null;
  notes?: string;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// In-memory local shipment registry for offline development
const localShipmentStore = new Map<string, ShipmentRecord>();

export async function createShipment(payload: {
  originId: string;
  destinationId: string;
  cargoType: string;
  cargoWeightKg: number;
  cargoVolumeM3?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
  userId?: string | null;
}): Promise<ShipmentRecord> {
  const shipmentId = `shp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const shipmentCode = `SHP-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const record: ShipmentRecord = {
    id: shipmentId,
    shipmentCode,
    originId: payload.originId,
    destinationId: payload.destinationId,
    cargoType: payload.cargoType,
    cargoWeightKg: payload.cargoWeightKg,
    cargoVolumeM3: payload.cargoVolumeM3 || 1.0,
    priority: payload.priority || 'MEDIUM',
    status: 'DRAFT',
    notes: payload.notes,
    createdAt: now,
    updatedAt: now,
  };

  localShipmentStore.set(shipmentId, record);

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('shipments').insert({
        id: shipmentId,
        shipment_code: shipmentCode,
        origin_id: payload.originId,
        destination_id: payload.destinationId,
        cargo_type: payload.cargoType,
        cargo_weight_kg: payload.cargoWeightKg,
        cargo_volume_m3: payload.cargoVolumeM3 || 1.0,
        priority: payload.priority || 'MEDIUM',
        status: 'DRAFT',
        notes: payload.notes || null,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.error('Failed to create shipment in Supabase:', err);
    }
  }

  await logShipmentCreated(shipmentId, payload.userId || null, {
    cargoType: payload.cargoType,
    cargoWeightKg: payload.cargoWeightKg,
    priority: payload.priority,
  });

  return record;
}

export async function dispatchShipment(payload: {
  shipmentId: string;
  vehicleId: string;
  driverId: string;
  routeId: string;
  dispatcherId?: string | null;
}): Promise<ShipmentRecord> {
  const now = new Date().toISOString();
  let shipment = localShipmentStore.get(payload.shipmentId);

  if (!shipment) {
    // If not in local store, synthesize initial record
    shipment = {
      id: payload.shipmentId,
      shipmentCode: `SHP-${payload.shipmentId.slice(0, 4)}`,
      originId: 'loc-gau',
      destinationId: 'loc-bom',
      cargoType: 'Medical Supplies',
      cargoWeightKg: 500,
      cargoVolumeM3: 2.0,
      priority: 'HIGH',
      status: 'DISPATCHED',
      createdAt: now,
      updatedAt: now,
    };
  }

  shipment.assignedVehicleId = payload.vehicleId;
  shipment.assignedDriverId = payload.driverId;
  shipment.activeRouteId = payload.routeId;
  shipment.dispatcherId = payload.dispatcherId || null;
  shipment.status = 'DISPATCHED';
  shipment.dispatchedAt = now;
  shipment.updatedAt = now;

  localShipmentStore.set(payload.shipmentId, shipment);

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase
        .from('shipments')
        .update({
          assigned_vehicle_id: payload.vehicleId,
          assigned_driver_id: payload.driverId,
          active_route_id: payload.routeId,
          dispatcher_id: payload.dispatcherId || null,
          status: 'DISPATCHED',
          dispatched_at: now,
          updated_at: now,
        })
        .eq('id', payload.shipmentId);
    } catch (err) {
      console.error('Failed to update shipment dispatch in Supabase:', err);
    }
  }

  // Record dispatch audit
  await logShipmentDispatched(
    payload.shipmentId,
    payload.dispatcherId || null,
    payload.vehicleId,
    payload.driverId,
    payload.routeId
  );

  // Notify driver
  const notifications = getNotificationProvider();
  await notifications.send({
    recipient: payload.driverId,
    channel: 'IN_APP',
    title: '🚚 NEW SHIPMENT DISPATCHED',
    body: `Shipment ${shipment.shipmentCode} is assigned to you. Prepare for departure.`,
    priority: 'HIGH',
    metadata: {
      shipmentId: payload.shipmentId,
      vehicleId: payload.vehicleId,
      routeId: payload.routeId,
    },
  });

  return shipment;
}

export async function updateShipmentStatus(
  shipmentId: string,
  status: ShipmentStatus,
  reason?: string
): Promise<ShipmentRecord | null> {
  const now = new Date().toISOString();
  let shipment = localShipmentStore.get(shipmentId);

  if (shipment) {
    shipment.status = status;
    shipment.updatedAt = now;
    if (status === 'DELIVERED') shipment.deliveredAt = now;
    localShipmentStore.set(shipmentId, shipment);
  }

  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const updates: Record<string, unknown> = {
        status,
        updated_at: now,
      };
      if (status === 'DELIVERED') updates.delivered_at = now;

      await supabase.from('shipments').update(updates).eq('id', shipmentId);
    } catch (err) {
      console.error('Failed to update shipment status in Supabase:', err);
    }
  }

  await logAuditEvent({
    action: `SHIPMENT_STATUS_${status}`,
    entityType: 'shipment',
    entityId: shipmentId,
    metadata: { reason },
  });

  return shipment || null;
}

export async function getShipment(shipmentId: string): Promise<ShipmentRecord | null> {
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (!error && data) {
        return {
          id: data.id,
          shipmentCode: data.shipment_code,
          originId: data.origin_id,
          destinationId: data.destination_id,
          cargoType: data.cargo_type,
          cargoWeightKg: Number(data.cargo_weight_kg),
          cargoVolumeM3: Number(data.cargo_volume_m3),
          priority: data.priority,
          status: data.status,
          assignedVehicleId: data.assigned_vehicle_id,
          assignedDriverId: data.assigned_driver_id,
          activeRouteId: data.active_route_id,
          dispatcherId: data.dispatcher_id,
          notes: data.notes,
          dispatchedAt: data.dispatched_at,
          deliveredAt: data.delivered_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback to local
    }
  }

  return localShipmentStore.get(shipmentId) || null;
}

export async function listAllShipments(): Promise<ShipmentRecord[]> {
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((d) => ({
          id: d.id,
          shipmentCode: d.shipment_code,
          originId: d.origin_id,
          destinationId: d.destination_id,
          cargoType: d.cargo_type,
          cargoWeightKg: Number(d.cargo_weight_kg),
          cargoVolumeM3: Number(d.cargo_volume_m3),
          priority: d.priority,
          status: d.status,
          assignedVehicleId: d.assigned_vehicle_id,
          assignedDriverId: d.assigned_driver_id,
          activeRouteId: d.active_route_id,
          dispatcherId: d.dispatcher_id,
          notes: d.notes,
          dispatchedAt: d.dispatched_at,
          deliveredAt: d.delivered_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    } catch {
      // Fallback
    }
  }

  return Array.from(localShipmentStore.values());
}
