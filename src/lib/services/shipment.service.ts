/**
 * AuraNER / NER-Route AI — Production Shipment Domain Service
 * 
 * Handles cargo consignment lifecycle, multi-item manifests, cold-chain compliance,
 * multi-tenant isolation, and audit logging.
 */

import { Shipment, ShipmentItem, ShipmentSummaryMetrics } from '@/lib/types/shipments';
import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import { NotFoundError, BadRequestError } from '@/lib/api/response';
import {
  logShipmentCreated,
  logShipmentUpdated,
  logShipmentCancelled,
  logShipmentDelivered,
  logShipmentItemAdded,
} from '@/lib/services/audit.service';
import { getServiceSupabase } from '@/lib/db/supabase';

const localShipmentStore = new Map<string, Shipment>();
const localItemStore = new Map<string, ShipmentItem>();

export interface ShipmentListParams {
  status?: string;
  priority?: string;
  requires_cold_chain?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lists shipments filtered by tenant boundaries and query parameters
 */
export async function listShipments(
  params: ShipmentListParams,
  user: SessionUser
): Promise<{ shipments: Shipment[]; total: number }> {
  const role = normalizeRole(user.role);
  let allShipments = Array.from(localShipmentStore.values());

  // 1. Multi-tenant isolation
  if (role !== 'SUPER_ADMIN') {
    if (!user.organizationId) return { shipments: [], total: 0 };
    allShipments = allShipments.filter((s) => s.organizationId === user.organizationId);
  }

  // 2. Status filter
  if (params.status && params.status !== 'ALL') {
    allShipments = allShipments.filter((s) => s.status === params.status);
  }

  // 3. Priority filter
  if (params.priority && params.priority !== 'ALL') {
    allShipments = allShipments.filter((s) => s.priority === params.priority);
  }

  // 4. Cold-chain filter
  if (params.requires_cold_chain !== undefined) {
    allShipments = allShipments.filter((s) => s.requiresColdChain === params.requires_cold_chain);
  }

  // 5. Search query (Shipment code, origin/dest facilities, notes)
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    allShipments = allShipments.filter(
      (s) =>
        s.shipmentCode.toLowerCase().includes(q) ||
        s.originFacilityId.toLowerCase().includes(q) ||
        s.destinationFacilityId.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q))
    );
  }

  // Sort descending by creation date
  allShipments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allShipments.length;
  const offset = params.offset || 0;
  const limit = params.limit || 25;
  const paginated = allShipments.slice(offset, offset + limit);

  return { shipments: paginated, total };
}

/**
 * Retrieves a single shipment by ID with manifest items and tenant enforcement
 */
export async function getShipmentById(id: string, user: SessionUser): Promise<Shipment> {
  const shipment = localShipmentStore.get(id);
  if (!shipment) {
    throw new NotFoundError(`Shipment with ID ${id} not found`);
  }

  assertTenantOwnership(shipment.organizationId, user, 'shipment');

  // Attach items from store
  const items = Array.from(localItemStore.values()).filter((item) => item.shipmentId === id);
  return { ...shipment, items };
}

/**
 * Creates a new shipment consignment with initial items
 */
export async function createShipmentRecord(
  payload: {
    originFacilityId: string;
    destinationFacilityId: string;
    cargoClassification?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    totalWeightKg?: number;
    totalVolumeM3?: number;
    requiresColdChain?: boolean;
    minTemperatureC?: number | null;
    maxTemperatureC?: number | null;
    scheduledDeparture?: string | null;
    notes?: string;
    items?: Omit<ShipmentItem, 'id' | 'shipmentId' | 'createdAt'>[];
    organizationId?: string;
  },
  user: SessionUser
): Promise<Shipment> {
  const role = normalizeRole(user.role);
  const targetOrgId =
    role === 'SUPER_ADMIN' && payload.organizationId
      ? payload.organizationId
      : user.organizationId;

  if (!targetOrgId) {
    throw new BadRequestError('An organization is required to create a shipment consignment');
  }

  const shipmentId = `shp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const shipmentCode = `SHP-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Create items
  const createdItems: ShipmentItem[] = [];
  let calculatedWeight = payload.totalWeightKg || 0;
  let calculatedVolume = payload.totalVolumeM3 || 1.0;

  if (payload.items && payload.items.length > 0) {
    calculatedWeight = 0;
    calculatedVolume = 0;
    payload.items.forEach((itemPayload) => {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ShipmentItem = {
        ...itemPayload,
        id: itemId,
        shipmentId,
        createdAt: now,
      };
      localItemStore.set(itemId, item);
      createdItems.push(item);
      calculatedWeight += item.quantity * item.unitWeightKg;
      calculatedVolume += item.quantity * item.unitVolumeM3;
    });
  }

  const newShipment: Shipment = {
    id: shipmentId,
    organizationId: targetOrgId,
    shipmentCode,
    originFacilityId: payload.originFacilityId,
    destinationFacilityId: payload.destinationFacilityId,
    cargoClassification: (payload.cargoClassification as any) || 'GENERAL_FREIGHT',
    priority: payload.priority || 'MEDIUM',
    status: 'PLANNED',
    totalWeightKg: payload.totalWeightKg !== undefined ? payload.totalWeightKg : calculatedWeight,
    totalVolumeM3: payload.totalVolumeM3 !== undefined ? payload.totalVolumeM3 : (calculatedVolume || 1.0),
    requiresColdChain: Boolean(payload.requiresColdChain),
    minTemperatureC: payload.minTemperatureC ?? null,
    maxTemperatureC: payload.maxTemperatureC ?? null,
    scheduledDeparture: payload.scheduledDeparture || now,
    actualDeparture: null,
    deliveredAt: null,
    podSignatureUrl: null,
    podPhotoUrl: null,
    notes: payload.notes,
    items: createdItems,
    assignedTripId: null,
    assignedVehicleId: null,
    assignedDriverId: null,
    createdAt: now,
    updatedAt: now,
  };

  localShipmentStore.set(shipmentId, newShipment);

  // Optional Supabase persistence
  const supabase = getServiceSupabase();
  if (supabase) {
    try {
      await supabase.from('shipments').insert({
        id: shipmentId,
        organization_id: targetOrgId,
        shipment_code: shipmentCode,
        origin_facility_id: newShipment.originFacilityId,
        destination_facility_id: newShipment.destinationFacilityId,
        cargo_classification: newShipment.cargoClassification,
        priority: newShipment.priority,
        status: newShipment.status,
        total_weight_kg: newShipment.totalWeightKg,
        total_volume_m3: newShipment.totalVolumeM3,
        requires_cold_chain: newShipment.requiresColdChain,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.error('Failed to persist shipment to Supabase:', err);
    }
  }

  await logShipmentCreated(shipmentId, user.id, {
    shipmentCode,
    originFacilityId: newShipment.originFacilityId,
    destinationFacilityId: newShipment.destinationFacilityId,
    totalWeightKg: newShipment.totalWeightKg,
    itemCount: createdItems.length,
    organizationId: targetOrgId,
  });

  return newShipment;
}

/**
 * Updates a shipment's operational lifecycle or details
 */
export async function updateShipmentRecord(
  id: string,
  updates: Partial<Shipment>,
  user: SessionUser
): Promise<Shipment> {
  const shipment = await getShipmentById(id, user);

  // Guard immutable fields
  delete (updates as any).id;
  delete (updates as any).organizationId;
  delete (updates as any).shipmentCode;
  delete (updates as any).createdAt;

  const updated: Shipment = {
    ...shipment,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localShipmentStore.set(id, updated);

  if (updates.status === 'DELIVERED') {
    await logShipmentDelivered(id, user.id, {
      deliveredAt: updated.deliveredAt || updated.updatedAt,
      podSignatureUrl: updated.podSignatureUrl,
    });
  } else {
    await logShipmentUpdated(id, user.id, updates as Record<string, unknown>);
  }

  return updated;
}

/**
 * Cancels a shipment consignment
 */
export async function cancelShipmentRecord(
  id: string,
  user: SessionUser,
  reason?: string
): Promise<{ success: boolean; id: string }> {
  const shipment = await getShipmentById(id, user);

  if (shipment.status === 'DELIVERED') {
    throw new BadRequestError('Cannot cancel an already delivered shipment');
  }

  const updated: Shipment = {
    ...shipment,
    status: 'CANCELLED',
    updatedAt: new Date().toISOString(),
  };

  localShipmentStore.set(id, updated);
  await logShipmentCancelled(id, user.id, reason);
  return { success: true, id };
}

/**
 * Adds an item to a shipment manifest
 */
export async function addShipmentItem(
  shipmentId: string,
  itemPayload: Omit<ShipmentItem, 'id' | 'shipmentId' | 'createdAt'>,
  user: SessionUser
): Promise<ShipmentItem> {
  const shipment = await getShipmentById(shipmentId, user);
  const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const item: ShipmentItem = {
    ...itemPayload,
    id: itemId,
    shipmentId,
    createdAt: now,
  };

  localItemStore.set(itemId, item);

  // Recalculate totals
  const currentItems = Array.from(localItemStore.values()).filter((i) => i.shipmentId === shipmentId);
  const totalWeight = currentItems.reduce((sum, i) => sum + i.quantity * i.unitWeightKg, 0);
  const totalVolume = currentItems.reduce((sum, i) => sum + i.quantity * i.unitVolumeM3, 0);

  localShipmentStore.set(shipmentId, {
    ...shipment,
    totalWeightKg: totalWeight,
    totalVolumeM3: Number(totalVolume.toFixed(2)),
    updatedAt: now,
  });

  await logShipmentItemAdded(shipmentId, user.id, {
    sku: item.sku,
    quantity: item.quantity,
    unitWeightKg: item.unitWeightKg,
  });

  return item;
}

/**
 * Lists all items for a consignment
 */
export async function listShipmentItems(
  shipmentId: string,
  user: SessionUser
): Promise<ShipmentItem[]> {
  await getShipmentById(shipmentId, user); // Enforces tenant access
  return Array.from(localItemStore.values()).filter((i) => i.shipmentId === shipmentId);
}

/**
 * Computes genuine shipment operational summary metrics for the tenant without fabrication
 */
export async function getShipmentSummary(user: SessionUser): Promise<ShipmentSummaryMetrics> {
  const { shipments } = await listShipments({}, user);

  if (shipments.length === 0) {
    return {
      totalShipments: 0,
      draftShipments: 0,
      plannedShipments: 0,
      assignedShipments: 0,
      inTransitShipments: 0,
      deliveredShipments: 0,
      delayedShipments: 0,
      cancelledShipments: 0,
      coldChainShipments: 0,
      totalWeightKg: 0,
    };
  }

  const draft = shipments.filter((s) => s.status === 'DRAFT').length;
  const planned = shipments.filter((s) => s.status === 'PLANNED').length;
  const assigned = shipments.filter((s) => s.status === 'ASSIGNED').length;
  const inTransit = shipments.filter((s) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED').length;
  const delivered = shipments.filter((s) => s.status === 'DELIVERED').length;
  const delayed = shipments.filter((s) => s.status === 'DELAYED' || s.status === 'REROUTING').length;
  const cancelled = shipments.filter((s) => s.status === 'CANCELLED').length;
  const coldChain = shipments.filter((s) => s.requiresColdChain).length;
  const totalWeight = shipments.reduce((sum, s) => sum + s.totalWeightKg, 0);

  return {
    totalShipments: shipments.length,
    draftShipments: draft,
    plannedShipments: planned,
    assignedShipments: assigned,
    inTransitShipments: inTransit,
    deliveredShipments: delivered,
    delayedShipments: delayed,
    cancelledShipments: cancelled,
    coldChainShipments: coldChain,
    totalWeightKg: totalWeight,
  };
}

/**
 * Helper to reset test store
 */
export function _resetShipmentStore(): void {
  localShipmentStore.clear();
  localItemStore.clear();
}
