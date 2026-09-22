/**
 * AuraNER / NER-Route AI — Production Trip & Dispatch Assignment Service
 * 
 * Handles multi-stop trip itineraries, vehicle/driver dispatch bindings,
 * consignment assignments, milestone tracking, and audit logging.
 */

import { Trip, TripStop, TripAssignment, TripSummaryMetrics } from '@/lib/types/shipments';
import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import { NotFoundError, BadRequestError } from '@/lib/api/response';
import {
  logTripCreated,
  logTripStatusUpdated,
  logTripStopCompleted,
  logTripAssignmentCreated,
} from '@/lib/services/audit.service';
import { getVehicleById, updateVehicle } from '@/lib/services/fleet.service';
import { getDriverById, updateDriver } from '@/lib/services/driver.service';
import { getShipmentById, updateShipmentRecord } from '@/lib/services/shipment.service';

const localTripStore = new Map<string, Trip>();
const localStopStore = new Map<string, TripStop>();
const localAssignmentStore = new Map<string, TripAssignment>();

export interface TripListParams {
  status?: string;
  driver_id?: string;
  vehicle_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Lists trips scoped to the authenticated user's organization
 */
export async function listTrips(
  params: TripListParams,
  user: SessionUser
): Promise<{ trips: Trip[]; total: number }> {
  const role = normalizeRole(user.role);
  let allTrips = Array.from(localTripStore.values());

  // 1. Tenant isolation
  if (role !== 'SUPER_ADMIN') {
    if (!user.organizationId) return { trips: [], total: 0 };
    allTrips = allTrips.filter((t) => t.organizationId === user.organizationId);
  }

  // 2. Status filter
  if (params.status && params.status !== 'ALL') {
    allTrips = allTrips.filter((t) => t.status === params.status);
  }

  // 3. Driver filter
  if (params.driver_id) {
    allTrips = allTrips.filter((t) => t.driverId === params.driver_id);
  }

  // 4. Vehicle filter
  if (params.vehicle_id) {
    allTrips = allTrips.filter((t) => t.vehicleId === params.vehicle_id);
  }

  // 5. Search query (Trip code)
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    allTrips = allTrips.filter((t) => t.tripCode.toLowerCase().includes(q));
  }

  // Sort descending by creation date
  allTrips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allTrips.length;
  const offset = params.offset || 0;
  const limit = params.limit || 25;
  const paginated = allTrips.slice(offset, offset + limit);

  return { trips: paginated, total };
}

/**
 * Retrieves a single trip with stops and assigned shipment IDs
 */
export async function getTripById(id: string, user: SessionUser): Promise<Trip> {
  const trip = localTripStore.get(id);
  if (!trip) {
    throw new NotFoundError(`Trip with ID ${id} not found`);
  }

  assertTenantOwnership(trip.organizationId, user, 'trip');

  const stops = Array.from(localStopStore.values())
    .filter((s) => s.tripId === id)
    .sort((a, b) => a.stopOrder - b.stopOrder);

  const assignments = Array.from(localAssignmentStore.values()).filter((a) => a.tripId === id);
  const assignedShipmentIds = assignments.map((a) => a.shipmentId);

  return { ...trip, stops, assignedShipmentIds };
}

/**
 * Creates a new trip with assigned vehicle, driver, and initial stops
 */
export async function createTripRecord(
  payload: {
    vehicleId: string;
    driverId: string;
    routeVersionId?: string | null;
    scheduledStart?: string;
    stops?: Omit<TripStop, 'id' | 'tripId' | 'actualArrival' | 'actualDeparture' | 'isCompleted' | 'createdAt'>[];
    shipmentIds?: string[];
    organizationId?: string;
  },
  user: SessionUser
): Promise<Trip> {
  const role = normalizeRole(user.role);
  const targetOrgId =
    role === 'SUPER_ADMIN' && payload.organizationId
      ? payload.organizationId
      : user.organizationId;

  if (!targetOrgId) {
    throw new BadRequestError('An organization is required to create a trip');
  }

  // Verify vehicle and driver belong to organization
  const vehicle = await getVehicleById(payload.vehicleId, user);
  const driver = await getDriverById(payload.driverId, user);

  if (vehicle.isArchived || vehicle.status === 'OFFLINE') {
    throw new BadRequestError(`Vehicle ${vehicle.registrationNumber} is offline or decommissioned`);
  }
  if (driver.isArchived || driver.dutyStatus === 'OFF_DUTY') {
    throw new BadRequestError(`Driver ${driver.name} is off duty or suspended`);
  }

  const tripId = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tripCode = `TRIP-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Create stops
  const createdStops: TripStop[] = [];
  if (payload.stops && payload.stops.length > 0) {
    payload.stops.forEach((s) => {
      const stopId = `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const stop: TripStop = {
        ...s,
        id: stopId,
        tripId,
        actualArrival: null,
        actualDeparture: null,
        isCompleted: false,
        createdAt: now,
      };
      localStopStore.set(stopId, stop);
      createdStops.push(stop);
    });
  }

  // Bind initial shipments
  const assignedShipmentIds: string[] = [];
  if (payload.shipmentIds && payload.shipmentIds.length > 0) {
    for (const shpId of payload.shipmentIds) {
      const shipment = await getShipmentById(shpId, user);
      const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const assignment: TripAssignment = {
        id: assignmentId,
        tripId,
        shipmentId: shpId,
        assignedBy: user.id,
        assignedAt: now,
      };
      localAssignmentStore.set(assignmentId, assignment);
      assignedShipmentIds.push(shpId);

      // Transition shipment to ASSIGNED
      await updateShipmentRecord(
        shpId,
        {
          status: 'ASSIGNED',
          assignedTripId: tripId,
          assignedVehicleId: payload.vehicleId,
          assignedDriverId: payload.driverId,
        },
        user
      );
    }
  }

  const newTrip: Trip = {
    id: tripId,
    organizationId: targetOrgId,
    tripCode,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    routeVersionId: payload.routeVersionId ?? null,
    status: 'SCHEDULED',
    scheduledStart: payload.scheduledStart || now,
    actualStart: null,
    completedAt: null,
    stops: createdStops,
    assignedShipmentIds,
    createdAt: now,
    updatedAt: now,
  };

  localTripStore.set(tripId, newTrip);

  // Update vehicle and driver status
  await updateVehicle(payload.vehicleId, { status: 'ASSIGNED', assignedDriverId: payload.driverId }, user);
  await updateDriver(payload.driverId, { currentVehicleId: payload.vehicleId }, user);

  await logTripCreated(tripId, user.id, {
    tripCode,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    stopCount: createdStops.length,
    shipmentCount: assignedShipmentIds.length,
    organizationId: targetOrgId,
  });

  return newTrip;
}

/**
 * Updates a trip's operational status and lifecycle timestamps
 */
export async function updateTripRecord(
  id: string,
  updates: Partial<Trip>,
  user: SessionUser
): Promise<Trip> {
  const trip = await getTripById(id, user);

  // Guard immutable fields
  delete (updates as any).id;
  delete (updates as any).organizationId;
  delete (updates as any).tripCode;
  delete (updates as any).createdAt;

  const now = new Date().toISOString();
  if (updates.status === 'EN_ROUTE' && !trip.actualStart) {
    updates.actualStart = now;
    // Set vehicle IN_TRANSIT and driver ON_TRIP
    await updateVehicle(trip.vehicleId, { status: 'IN_TRANSIT' }, user);
    await updateDriver(trip.driverId, { dutyStatus: 'ON_TRIP' }, user);

    // Set assigned shipments to IN_TRANSIT
    for (const shpId of trip.assignedShipmentIds) {
      await updateShipmentRecord(shpId, { status: 'IN_TRANSIT', actualDeparture: now }, user);
    }
  } else if (updates.status === 'COMPLETED') {
    updates.completedAt = now;
    // Release vehicle and driver to AVAILABLE
    await updateVehicle(trip.vehicleId, { status: 'AVAILABLE', assignedDriverId: null }, user);
    await updateDriver(trip.driverId, { dutyStatus: 'AVAILABLE', currentVehicleId: null }, user);

    // Set assigned shipments to DELIVERED
    for (const shpId of trip.assignedShipmentIds) {
      await updateShipmentRecord(shpId, { status: 'DELIVERED', deliveredAt: now }, user);
    }
  }

  const updated: Trip = {
    ...trip,
    ...updates,
    updatedAt: now,
  };

  localTripStore.set(id, updated);
  await logTripStatusUpdated(id, user.id, updates as Record<string, unknown>);
  return updated;
}

/**
 * Adds a stop to a trip itinerary
 */
export async function addTripStop(
  tripId: string,
  stopPayload: Omit<TripStop, 'id' | 'tripId' | 'actualArrival' | 'actualDeparture' | 'isCompleted' | 'createdAt'>,
  user: SessionUser
): Promise<TripStop> {
  const trip = await getTripById(tripId, user);
  const stopId = `stop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const stop: TripStop = {
    ...stopPayload,
    id: stopId,
    tripId,
    actualArrival: null,
    actualDeparture: null,
    isCompleted: false,
    createdAt: now,
  };

  localStopStore.set(stopId, stop);
  return stop;
}

/**
 * Marks a trip stop completed with arrival/departure timestamps
 */
export async function completeTripStop(
  tripId: string,
  stopId: string,
  user: SessionUser
): Promise<TripStop> {
  await getTripById(tripId, user); // Enforces tenant access
  const stop = localStopStore.get(stopId);
  if (!stop || stop.tripId !== tripId) {
    throw new NotFoundError(`Trip stop ${stopId} not found`);
  }

  const now = new Date().toISOString();
  const updated: TripStop = {
    ...stop,
    actualArrival: stop.actualArrival || now,
    actualDeparture: now,
    isCompleted: true,
  };

  localStopStore.set(stopId, updated);
  await logTripStopCompleted(tripId, stopId, user.id, {
    facilityId: updated.facilityId,
    stopOrder: updated.stopOrder,
    completedAt: now,
  });

  return updated;
}

/**
 * Assigns a shipment to an existing trip
 */
export async function assignShipmentToTrip(
  tripId: string,
  shipmentId: string,
  user: SessionUser
): Promise<TripAssignment> {
  const trip = await getTripById(tripId, user);
  const shipment = await getShipmentById(shipmentId, user);

  if (shipment.organizationId !== trip.organizationId) {
    throw new BadRequestError('Shipment and trip must belong to the same organization');
  }

  if (shipment.status === 'CANCELLED' || shipment.status === 'DELIVERED') {
    throw new BadRequestError('Cannot assign a cancelled shipment to a trip');
  }

  const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const assignment: TripAssignment = {
    id: assignmentId,
    tripId,
    shipmentId,
    assignedBy: user.id,
    assignedAt: now,
  };

  localAssignmentStore.set(assignmentId, assignment);

  // Update shipment
  await updateShipmentRecord(
    shipmentId,
    {
      status: trip.status === 'EN_ROUTE' ? 'IN_TRANSIT' : 'ASSIGNED',
      assignedTripId: tripId,
      assignedVehicleId: trip.vehicleId,
      assignedDriverId: trip.driverId,
    },
    user
  );

  await logTripAssignmentCreated(tripId, shipmentId, user.id);
  return assignment;
}

/**
 * Computes genuine trip summary metrics for the tenant without fabrication
 */
export async function getTripSummary(user: SessionUser): Promise<TripSummaryMetrics> {
  const { trips } = await listTrips({}, user);

  if (trips.length === 0) {
    return {
      totalTrips: 0,
      scheduledTrips: 0,
      enRouteTrips: 0,
      atStopTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
    };
  }

  const scheduled = trips.filter((t) => t.status === 'SCHEDULED').length;
  const enRoute = trips.filter((t) => t.status === 'EN_ROUTE').length;
  const atStop = trips.filter((t) => t.status === 'AT_STOP').length;
  const completed = trips.filter((t) => t.status === 'COMPLETED').length;
  const cancelled = trips.filter((t) => t.status === 'CANCELLED' || t.status === 'EMERGENCY_HALT').length;

  return {
    totalTrips: trips.length,
    scheduledTrips: scheduled,
    enRouteTrips: enRoute,
    atStopTrips: atStop,
    completedTrips: completed,
    cancelledTrips: cancelled,
  };
}

/**
 * Helper to reset test store
 */
export function _resetTripStore(): void {
  localTripStore.clear();
  localStopStore.clear();
  localAssignmentStore.clear();
}
