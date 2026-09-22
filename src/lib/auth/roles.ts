/**
 * AuraNER / NER-Route AI — Production Role-Based Access Control (RBAC) Specification
 * 
 * Enforces the 6 core enterprise operational roles:
 * - SUPER_ADMIN: Global cross-tenant oversight, system configuration & provider management
 * - ORG_ADMIN: Tenant-scoped administrator managing members, facilities, and assets
 * - DISPATCHER: Operational dispatch controller managing live routes, shipments & alert triage
 * - LOGISTICS_MANAGER: Fleet health, driver compliance, analytics & audit logs
 * - DRIVER: In-cab mobile operator executing assigned trips, pings & hazard reporting
 * - VIEWER: Read-only observer for regulatory compliance and safety radar
 */

export type SystemRoleCode =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'DISPATCHER'
  | 'LOGISTICS_MANAGER'
  | 'DRIVER'
  | 'VIEWER';

// Legacy compatibility aliases
export type UserRole =
  | SystemRoleCode
  | 'super_admin'
  | 'admin'
  | 'dispatcher'
  | 'operator'
  | 'driver'
  | 'officer'
  | 'viewer';

export type Permission =
  // Organizations & Team Members
  | 'organizations:read'
  | 'organizations:manage'
  | 'members:read'
  | 'members:manage'
  // Fleet & Assets
  | 'fleet:read'
  | 'fleet:manage'
  // Drivers & Personnel
  | 'drivers:read'
  | 'drivers:manage'
  // Shipments & Dispatch
  | 'shipments:create'
  | 'shipments:read'
  | 'shipments:update'
  | 'shipments:dispatch'
  | 'shipments:cancel'
  | 'shipments:deliver'
  // Smart Routing & Terrain Computing
  | 'routes:calculate'
  | 'routes:recalculate'
  | 'routes:override'
  | 'routes:view_all'
  // Telemetry & GPS Tracking
  | 'telemetry:read'
  | 'telemetry:write'
  // Hazards & Incidents
  | 'incidents:report'
  | 'incidents:verify'
  | 'incidents:resolve'
  // Alerts & Safety Notifications
  | 'alerts:view'
  | 'alerts:acknowledge'
  | 'alerts:escalate'
  // Cryptographic Audit & Compliance
  | 'audit:read'
  | 'audit:export'
  // NER Data Feeds & External Ingestion
  | 'data:read'
  | 'data:ingest';

export const ALL_PERMISSIONS: Permission[] = [
  'organizations:read',
  'organizations:manage',
  'members:read',
  'members:manage',
  'fleet:read',
  'fleet:manage',
  'drivers:read',
  'drivers:manage',
  'shipments:create',
  'shipments:read',
  'shipments:update',
  'shipments:dispatch',
  'shipments:cancel',
  'shipments:deliver',
  'routes:calculate',
  'routes:recalculate',
  'routes:override',
  'routes:view_all',
  'telemetry:read',
  'telemetry:write',
  'incidents:report',
  'incidents:verify',
  'incidents:resolve',
  'alerts:view',
  'alerts:acknowledge',
  'alerts:escalate',
  'audit:read',
  'audit:export',
  'data:read',
  'data:ingest',
];

export const ROLE_PERMISSIONS: Record<SystemRoleCode, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  ORG_ADMIN: [
    'organizations:read',
    'members:read',
    'members:manage',
    'fleet:read',
    'fleet:manage',
    'drivers:read',
    'drivers:manage',
    'shipments:create',
    'shipments:read',
    'shipments:update',
    'shipments:dispatch',
    'shipments:cancel',
    'shipments:deliver',
    'routes:calculate',
    'routes:recalculate',
    'routes:override',
    'routes:view_all',
    'telemetry:read',
    'telemetry:write',
    'incidents:report',
    'incidents:verify',
    'incidents:resolve',
    'alerts:view',
    'alerts:acknowledge',
    'alerts:escalate',
    'audit:read',
    'audit:export',
    'data:read',
    'data:ingest',
  ],

  DISPATCHER: [
    'organizations:read',
    'members:read',
    'fleet:read',
    'drivers:read',
    'shipments:create',
    'shipments:read',
    'shipments:update',
    'shipments:dispatch',
    'shipments:cancel',
    'routes:calculate',
    'routes:recalculate',
    'routes:override',
    'routes:view_all',
    'telemetry:read',
    'telemetry:write',
    'incidents:report',
    'incidents:verify',
    'alerts:view',
    'alerts:acknowledge',
    'alerts:escalate',
    'audit:read',
    'data:read',
    'data:ingest',
  ],

  LOGISTICS_MANAGER: [
    'organizations:read',
    'members:read',
    'fleet:read',
    'fleet:manage',
    'drivers:read',
    'drivers:manage',
    'shipments:read',
    'routes:calculate',
    'routes:view_all',
    'telemetry:read',
    'telemetry:write',
    'incidents:report',
    'alerts:view',
    'audit:read',
    'audit:export',
    'data:read',
  ],

  DRIVER: [
    'shipments:read',
    'shipments:deliver',
    'routes:calculate',
    'telemetry:read',
    'telemetry:write',
    'incidents:report',
    'alerts:view',
    'alerts:acknowledge',
    'data:read',
  ],

  VIEWER: [
    'organizations:read',
    'fleet:read',
    'shipments:read',
    'routes:view_all',
    'telemetry:read',
    'alerts:view',
    'data:read',
  ],
};

/**
 * Normalizes any role string into a canonical SystemRoleCode
 */
export function normalizeRole(role?: string | null): SystemRoleCode {
  if (!role) return 'VIEWER';
  const clean = role.trim().toUpperCase().replace(/-/g, '_');

  switch (clean) {
    case 'SUPER_ADMIN':
    case 'SUPERADMIN':
      return 'SUPER_ADMIN';
    case 'ORG_ADMIN':
    case 'ORGADMIN':
    case 'ADMIN':
      return 'ORG_ADMIN';
    case 'DISPATCHER':
      return 'DISPATCHER';
    case 'LOGISTICS_MANAGER':
    case 'LOGISTICSMANAGER':
    case 'LOGISTICS_LEAD':
    case 'OPS_MANAGER':
    case 'OPSMANAGER':
      return 'LOGISTICS_MANAGER';
    case 'DRIVER':
      return 'DRIVER';
    case 'OPERATOR':
      return 'DISPATCHER';
    case 'OFFICER':
      return 'LOGISTICS_MANAGER';
    case 'VIEWER':
    default:
      return 'VIEWER';
  }
}

/**
 * Checks whether a given role has a specific granular permission
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const canonicalRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonicalRole];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Checks whether a given role has at least one of the specified permissions
 */
export function hasAnyPermission(role: UserRole | string | undefined | null, permissions: Permission[]): boolean {
  if (!role || permissions.length === 0) return false;
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Checks whether a given role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | string | undefined | null, permissions: Permission[]): boolean {
  if (!role || permissions.length === 0) return false;
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Checks whether a given role belongs to an allowed set of roles
 */
export function isAuthorized(
  role: UserRole | string | undefined | null,
  allowedRoles: (SystemRoleCode | UserRole)[]
): boolean {
  if (!role) return false;
  const canonicalRole = normalizeRole(role);
  const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
  return normalizedAllowed.includes(canonicalRole);
}
