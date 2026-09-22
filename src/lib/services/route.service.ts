/**
 * AuraNER / NER-Route AI — Production Route Domain Service
 * 
 * Manages Route corridors, Route Versions, and Route Segments adhering to
 * Phase 4 PostgreSQL/PostGIS domain model, Phase 6 multi-tenant isolation,
 * and Phase 11 RoutingService provider integrations.
 */

import { SessionUser } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import { assertTenantOwnership } from '@/lib/db/tenant-scope';
import { NotFoundError, BadRequestError } from '@/lib/api/response';
import {
  Coordinates,
  RouteCalculationConstraints,
  RouteCalculationResult,
  RouteSegment,
  DistanceMatrixResult,
  getRoutingService,
} from '@/lib/routing';
import {
  logRouteSaved,
  logRouteVersionCreated,
} from '@/lib/services/audit.service';

export interface RouteRecord {
  id: string;
  organizationId: string;
  name: string;
  originLocationId: string;
  destinationLocationId: string;
  corridorHighwayCode?: string;
  isTemplate: boolean;
  activeVersionId: string | null;
  versions: RouteVersionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteVersionRecord {
  id: string;
  routeId: string;
  versionNumber: number;
  geometry: [number, number][]; // [lng, lat][]
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  elevationGainMeters: number;
  maxGradientPct: number;
  compositeRiskScore: number;
  isActive: boolean;
  changeReason?: string;
  provenance: {
    providerName: string;
    calculationTimestamp: string;
    latencyMs: number;
    cacheStatus: string;
    routeHash: string;
  };
  segments: RouteSegment[];
  createdAt: string;
}

// In-memory tenant-scoped route storage (mirrors PostgreSQL tables)
const localRouteStore = new Map<string, RouteRecord>();
const localVersionStore = new Map<string, RouteVersionRecord>();

/**
 * Plans a route on-the-fly using the active RoutingService provider
 */
export async function planRoute(
  origin: Coordinates,
  destination: Coordinates,
  constraints?: RouteCalculationConstraints
): Promise<RouteCalculationResult> {
  const routing = getRoutingService();
  return routing.calculateRoute(origin, destination, constraints);
}

export const calculateRoute = planRoute;

/**
 * Calculates a multi-point distance and duration matrix
 */
export async function calculateMatrix(
  origins: Coordinates[],
  destinations: Coordinates[]
): Promise<DistanceMatrixResult> {
  const routing = getRoutingService();
  return routing.calculateMatrix(origins, destinations);
}

/**
 * Persists a calculated route as a corridor template or active route with Version 1
 */
export async function saveRoute(
  payload: {
    name: string;
    originLocationId: string;
    destinationLocationId: string;
    corridorHighwayCode?: string;
    isTemplate?: boolean;
    originCoords: Coordinates;
    destinationCoords: Coordinates;
    constraints?: RouteCalculationConstraints;
    organizationId?: string;
  },
  user: SessionUser
): Promise<RouteRecord> {
  const role = normalizeRole(user.role);
  const targetOrgId =
    role === 'SUPER_ADMIN' && payload.organizationId
      ? payload.organizationId
      : user.organizationId;

  if (!targetOrgId) {
    throw new BadRequestError('An organization is required to save a route corridor');
  }

  // 1. Calculate actual route using provider
  const calculated = await planRoute(payload.originCoords, payload.destinationCoords, payload.constraints);

  const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const versionId = `rver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // 2. Create Route Version 1
  const versionRecord: RouteVersionRecord = {
    id: versionId,
    routeId,
    versionNumber: 1,
    geometry: calculated.geometry,
    totalDistanceKm: calculated.distanceKm,
    estimatedDurationMinutes: calculated.durationMinutes,
    elevationGainMeters: calculated.elevationGainMeters,
    maxGradientPct: calculated.maxGradientPct,
    compositeRiskScore: 0,
    isActive: true,
    changeReason: 'Initial Route Baseline Creation',
    provenance: calculated.provenance,
    segments: calculated.segments,
    createdAt: now,
  };
  localVersionStore.set(versionId, versionRecord);

  // 3. Create Parent Route
  const routeRecord: RouteRecord = {
    id: routeId,
    organizationId: targetOrgId,
    name: payload.name.trim(),
    originLocationId: payload.originLocationId,
    destinationLocationId: payload.destinationLocationId,
    corridorHighwayCode: payload.corridorHighwayCode,
    isTemplate: Boolean(payload.isTemplate),
    activeVersionId: versionId,
    versions: [versionRecord],
    createdAt: now,
    updatedAt: now,
  };
  localRouteStore.set(routeId, routeRecord);

  await logRouteSaved(routeId, user.id, {
    name: routeRecord.name,
    versionNumber: 1,
    distanceKm: calculated.distanceKm,
    durationMinutes: calculated.durationMinutes,
    provider: calculated.provenance.providerName,
    organizationId: targetOrgId,
  });

  return routeRecord;
}

/**
 * Creates a new version for an existing route (e.g., version 2 upon weather/detour changes)
 */
export async function createRouteVersion(
  routeId: string,
  payload: {
    originCoords: Coordinates;
    destinationCoords: Coordinates;
    changeReason: string;
    constraints?: RouteCalculationConstraints;
  },
  user: SessionUser
): Promise<RouteVersionRecord> {
  const route = await getRouteById(routeId, user);

  // Calculate new version
  const calculated = await planRoute(payload.originCoords, payload.destinationCoords, payload.constraints);

  // Mark existing versions as inactive
  const existingVersions = Array.from(localVersionStore.values()).filter((v) => v.routeId === routeId);
  for (const v of existingVersions) {
    v.isActive = false;
    localVersionStore.set(v.id, v);
  }

  const nextVersionNumber = existingVersions.length + 1;
  const versionId = `rver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newVersion: RouteVersionRecord = {
    id: versionId,
    routeId,
    versionNumber: nextVersionNumber,
    geometry: calculated.geometry,
    totalDistanceKm: calculated.distanceKm,
    estimatedDurationMinutes: calculated.durationMinutes,
    elevationGainMeters: calculated.elevationGainMeters,
    maxGradientPct: calculated.maxGradientPct,
    compositeRiskScore: 0,
    isActive: true,
    changeReason: payload.changeReason,
    provenance: calculated.provenance,
    segments: calculated.segments,
    createdAt: now,
  };

  localVersionStore.set(versionId, newVersion);

  // Update parent route
  route.activeVersionId = versionId;
  route.updatedAt = now;
  route.versions = [...existingVersions, newVersion];
  localRouteStore.set(routeId, route);

  await logRouteVersionCreated(routeId, versionId, user.id, {
    versionNumber: nextVersionNumber,
    changeReason: payload.changeReason,
    distanceKm: calculated.distanceKm,
    durationMinutes: calculated.durationMinutes,
    provider: calculated.provenance.providerName,
  });

  return newVersion;
}

/**
 * Retrieves a single route by ID with active version, segments, and version history
 */
export async function getRouteById(id: string, user: SessionUser): Promise<RouteRecord> {
  const route = localRouteStore.get(id);
  if (!route) {
    throw new NotFoundError(`Route with ID ${id} not found`);
  }

  assertTenantOwnership(route.organizationId, user, 'route');

  const versions = Array.from(localVersionStore.values())
    .filter((v) => v.routeId === id)
    .sort((a, b) => b.versionNumber - a.versionNumber);

  return {
    ...route,
    versions,
  };
}

/**
 * Retrieves a single route version by ID
 */
export async function getRouteVersionById(
  versionId: string,
  user?: SessionUser
): Promise<RouteVersionRecord> {
  const version = localVersionStore.get(versionId);
  if (!version) {
    throw new NotFoundError(`Route version with ID ${versionId} not found`);
  }
  return version;
}

/**
 * Lists routes scoped to the user's organization
 */
export async function listRoutes(
  params: { search?: string; limit?: number; offset?: number },
  user: SessionUser
): Promise<{ routes: RouteRecord[]; total: number }> {
  const role = normalizeRole(user.role);
  let allRoutes = Array.from(localRouteStore.values());

  // 1. Multi-tenant isolation
  if (role !== 'SUPER_ADMIN') {
    if (!user.organizationId) return { routes: [], total: 0 };
    allRoutes = allRoutes.filter((r) => r.organizationId === user.organizationId);
  }

  // 2. Search query (name, highway code, origin/dest)
  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim().toLowerCase();
    allRoutes = allRoutes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.originLocationId.toLowerCase().includes(q) ||
        r.destinationLocationId.toLowerCase().includes(q) ||
        (r.corridorHighwayCode && r.corridorHighwayCode.toLowerCase().includes(q))
    );
  }

  allRoutes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allRoutes.length;
  const offset = params.offset || 0;
  const limit = params.limit || 25;
  const paginated = allRoutes.slice(offset, offset + limit).map((r) => {
    const versions = Array.from(localVersionStore.values()).filter((v) => v.routeId === r.id);
    return { ...r, versions };
  });

  return { routes: paginated, total };
}

/**
 * Helper to reset in-memory route stores for testing
 */
export function _resetRouteStore(): void {
  localRouteStore.clear();
  localVersionStore.clear();
}
