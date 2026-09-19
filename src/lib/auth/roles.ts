export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'dispatcher'
  | 'operator'
  | 'driver'
  | 'officer'
  | 'viewer';

export type Permission =
  // Shipments & Dispatch
  | 'shipments:create'
  | 'shipments:read'
  | 'shipments:update'
  | 'shipments:dispatch'
  | 'shipments:cancel'
  | 'shipments:deliver'
  // Routing & Risk
  | 'routes:calculate'
  | 'routes:recalculate'
  | 'routes:override'
  | 'routes:view_all'
  // Incidents
  | 'incidents:report'
  | 'incidents:verify'
  | 'incidents:resolve'
  // Alerts & Safety
  | 'alerts:view'
  | 'alerts:acknowledge'
  | 'alerts:escalate'
  // Fleet & Telemetry
  | 'fleet:read'
  | 'fleet:manage'
  | 'telemetry:write'
  // Administration & Audit
  | 'users:manage'
  | 'audit:read';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'shipments:create', 'shipments:read', 'shipments:update', 'shipments:dispatch', 'shipments:cancel', 'shipments:deliver',
    'routes:calculate', 'routes:recalculate', 'routes:override', 'routes:view_all',
    'incidents:report', 'incidents:verify', 'incidents:resolve',
    'alerts:view', 'alerts:acknowledge', 'alerts:escalate',
    'fleet:read', 'fleet:manage', 'telemetry:write',
    'users:manage', 'audit:read',
  ],
  admin: [
    'shipments:create', 'shipments:read', 'shipments:update', 'shipments:dispatch', 'shipments:cancel', 'shipments:deliver',
    'routes:calculate', 'routes:recalculate', 'routes:override', 'routes:view_all',
    'incidents:report', 'incidents:verify', 'incidents:resolve',
    'alerts:view', 'alerts:acknowledge', 'alerts:escalate',
    'fleet:read', 'fleet:manage', 'telemetry:write',
    'audit:read',
  ],
  dispatcher: [
    'shipments:create', 'shipments:read', 'shipments:update', 'shipments:dispatch', 'shipments:cancel',
    'routes:calculate', 'routes:recalculate', 'routes:override', 'routes:view_all',
    'incidents:report', 'incidents:verify',
    'alerts:view', 'alerts:acknowledge', 'alerts:escalate',
    'fleet:read', 'audit:read',
  ],
  operator: [
    'shipments:create', 'shipments:read', 'shipments:update', 'shipments:dispatch',
    'routes:calculate', 'routes:view_all',
    'incidents:report',
    'alerts:view', 'alerts:acknowledge',
    'fleet:read',
  ],
  officer: [
    'shipments:read',
    'routes:view_all',
    'incidents:report', 'incidents:verify', 'incidents:resolve',
    'alerts:view', 'alerts:escalate',
    'fleet:read', 'audit:read',
  ],
  driver: [
    'shipments:read',
    'shipments:deliver',
    'routes:calculate',
    'incidents:report',
    'alerts:view', 'alerts:acknowledge',
    'telemetry:write',
  ],
  viewer: [
    'shipments:read',
    'routes:view_all',
    'alerts:view',
    'fleet:read',
  ],
};

export function hasPermission(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function isAuthorized(role: UserRole | string | undefined, allowedRoles: UserRole[]): boolean {
  if (!role) return false;
  return allowedRoles.includes(role as UserRole);
}
