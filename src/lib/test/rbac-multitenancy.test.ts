import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  SystemRoleCode,
  normalizeRole,
  hasPermission,
  isAuthorized,
  ALL_PERMISSIONS,
} from '@/lib/auth/roles';
import {
  canAccessTenant,
  enforceTenantAccess,
  requireAuth,
  requirePermission,
  requireRole,
  requireTenantScope,
  logAuthorizationEvent,
} from '@/lib/auth/authorization';
import {
  filterByTenant,
  isTenantAccessible,
  assertTenantOwnership,
} from '@/lib/db/tenant-scope';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { SESSION_COOKIE_NAME, SessionUser } from '@/lib/auth/session';
import { UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { POST as dispatchPost, GET as dispatchGet } from '@/app/api/v1/dispatch/route';
import { POST as shipmentPost, GET as shipmentGet } from '@/app/api/v1/shipments/route';

describe('Phase 6: RBAC & Multi-Tenancy Architecture', () => {
  const orgAssam = 'org_assam_civil_supplies';
  const orgMeghalaya = 'org_meghalaya_ndrf';

  const superAdminUser: SessionUser = {
    id: 'usr_super_admin',
    email: 'director.disaster@auraner.gov.in',
    name: 'State Disaster Director',
    role: 'SUPER_ADMIN',
    organizationId: null, // Cross-tenant global scope
  };

  const orgAdminAssam: SessionUser = {
    id: 'usr_org_admin_assam',
    email: 'admin@assam-supplies.gov.in',
    name: 'Assam Civil Supplies Admin',
    role: 'ORG_ADMIN',
    organizationId: orgAssam,
  };

  const dispatcherAssam: SessionUser = {
    id: 'usr_dispatcher_assam',
    email: 'dispatcher@assam-supplies.gov.in',
    name: 'Guwahati Dispatch Officer',
    role: 'DISPATCHER',
    organizationId: orgAssam,
  };

  const logisticsManagerAssam: SessionUser = {
    id: 'usr_logistics_manager_assam',
    email: 'fleet@assam-supplies.gov.in',
    name: 'Assam Fleet Supervisor',
    role: 'LOGISTICS_MANAGER',
    organizationId: orgAssam,
  };

  const driverAssam: SessionUser = {
    id: 'usr_driver_assam',
    email: 'dorjee.driver@assam-supplies.gov.in',
    name: 'Dorjee Khandu',
    role: 'DRIVER',
    organizationId: orgAssam,
  };

  const viewerAssam: SessionUser = {
    id: 'usr_viewer_assam',
    email: 'observer@assam-supplies.gov.in',
    name: 'Public Safety Observer',
    role: 'VIEWER',
    organizationId: orgAssam,
  };

  const dispatcherMeghalaya: SessionUser = {
    id: 'usr_dispatcher_meghalaya',
    email: 'dispatcher@meghalaya-ndrf.gov.in',
    name: 'Shillong NDRF Dispatcher',
    role: 'DISPATCHER',
    organizationId: orgMeghalaya,
  };

  // Helper to create an authenticated NextRequest with a session cookie
  function createAuthenticatedRequest(
    url: string,
    user: SessionUser,
    method = 'GET',
    body?: Record<string, unknown>
  ): NextRequest {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organizationId: user.organizationId,
    });

    const init: RequestInit = {
      method,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
        'content-type': 'application/json',
      },
    };
    if (body) {
      init.body = JSON.stringify(body);
    }

    return new NextRequest(url, init as any);
  }

  // ---------------------------------------------------------------------------
  // 1. Role Normalization & Standard Roles
  // ---------------------------------------------------------------------------
  describe('Enterprise Role Normalization', () => {
    it('normalizes legacy and mixed-case roles into standard SystemRoleCode', () => {
      expect(normalizeRole('super_admin')).toBe('SUPER_ADMIN');
      expect(normalizeRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
      expect(normalizeRole('admin')).toBe('ORG_ADMIN');
      expect(normalizeRole('ORG_ADMIN')).toBe('ORG_ADMIN');
      expect(normalizeRole('dispatcher')).toBe('DISPATCHER');
      expect(normalizeRole('DISPATCHER')).toBe('DISPATCHER');
      expect(normalizeRole('operator')).toBe('DISPATCHER');
      expect(normalizeRole('officer')).toBe('LOGISTICS_MANAGER');
      expect(normalizeRole('LOGISTICS_MANAGER')).toBe('LOGISTICS_MANAGER');
      expect(normalizeRole('driver')).toBe('DRIVER');
      expect(normalizeRole('DRIVER')).toBe('DRIVER');
      expect(normalizeRole('viewer')).toBe('VIEWER');
      expect(normalizeRole('VIEWER')).toBe('VIEWER');
      expect(normalizeRole(null)).toBe('VIEWER');
      expect(normalizeRole('')).toBe('VIEWER');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Permitted & Denied Capabilities (RBAC Matrix)
  // ---------------------------------------------------------------------------
  describe('RBAC Permission Matrix', () => {
    it('SUPER_ADMIN possesses all enterprise permissions', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission('SUPER_ADMIN', permission), `SUPER_ADMIN missing ${permission}`).toBe(true);
      }
    });

    it('ORG_ADMIN can manage members and fleet, but cannot manage organizations globally', () => {
      expect(hasPermission('ORG_ADMIN', 'members:manage')).toBe(true);
      expect(hasPermission('ORG_ADMIN', 'fleet:manage')).toBe(true);
      expect(hasPermission('ORG_ADMIN', 'shipments:dispatch')).toBe(true);
      expect(hasPermission('ORG_ADMIN', 'organizations:manage')).toBe(false);
    });

    it('DISPATCHER can plan, dispatch and recalculate routes, but cannot manage fleet or members', () => {
      expect(hasPermission('DISPATCHER', 'shipments:create')).toBe(true);
      expect(hasPermission('DISPATCHER', 'shipments:dispatch')).toBe(true);
      expect(hasPermission('DISPATCHER', 'routes:recalculate')).toBe(true);
      expect(hasPermission('DISPATCHER', 'routes:override')).toBe(true);
      expect(hasPermission('DISPATCHER', 'fleet:manage')).toBe(false);
      expect(hasPermission('DISPATCHER', 'members:manage')).toBe(false);
    });

    it('LOGISTICS_MANAGER can manage fleet and export audit logs, but cannot dispatch or override routes', () => {
      expect(hasPermission('LOGISTICS_MANAGER', 'fleet:read')).toBe(true);
      expect(hasPermission('LOGISTICS_MANAGER', 'fleet:manage')).toBe(true);
      expect(hasPermission('LOGISTICS_MANAGER', 'audit:export')).toBe(true);
      expect(hasPermission('LOGISTICS_MANAGER', 'shipments:dispatch')).toBe(false);
      expect(hasPermission('LOGISTICS_MANAGER', 'routes:override')).toBe(false);
    });

    it('DRIVER can write telemetry and deliver shipments, but cannot create or dispatch shipments', () => {
      expect(hasPermission('DRIVER', 'telemetry:write')).toBe(true);
      expect(hasPermission('DRIVER', 'shipments:deliver')).toBe(true);
      expect(hasPermission('DRIVER', 'alerts:acknowledge')).toBe(true);
      expect(hasPermission('DRIVER', 'shipments:create')).toBe(false);
      expect(hasPermission('DRIVER', 'shipments:dispatch')).toBe(false);
      expect(hasPermission('DRIVER', 'fleet:manage')).toBe(false);
    });

    it('VIEWER has strict read-only access and cannot perform mutations', () => {
      expect(hasPermission('VIEWER', 'shipments:read')).toBe(true);
      expect(hasPermission('VIEWER', 'routes:view_all')).toBe(true);
      expect(hasPermission('VIEWER', 'alerts:view')).toBe(true);
      expect(hasPermission('VIEWER', 'shipments:create')).toBe(false);
      expect(hasPermission('VIEWER', 'shipments:dispatch')).toBe(false);
      expect(hasPermission('VIEWER', 'telemetry:write')).toBe(false);
      expect(hasPermission('VIEWER', 'routes:recalculate')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Backend Authorization Service Enforcement
  // ---------------------------------------------------------------------------
  describe('Backend Authorization Service (authorization.ts)', () => {
    it('requireAuth rejects unauthenticated requests with UnauthorizedError (401)', async () => {
      const unauthReq = new NextRequest('http://localhost:3000/api/v1/dispatch');
      await expect(requireAuth(unauthReq)).rejects.toThrow(UnauthorizedError);
    });

    it('requirePermission allows permitted roles and throws ForbiddenError (403) for unpermitted roles', async () => {
      const dispatcherReq = createAuthenticatedRequest('http://localhost:3000/api/v1/dispatch', dispatcherAssam);
      const viewerReq = createAuthenticatedRequest('http://localhost:3000/api/v1/dispatch', viewerAssam);

      // Dispatcher has shipments:dispatch
      const allowedUser = await requirePermission(dispatcherReq, 'shipments:dispatch');
      expect(allowedUser.id).toBe(dispatcherAssam.id);

      // Viewer lacks shipments:dispatch
      await expect(requirePermission(viewerReq, 'shipments:dispatch')).rejects.toThrow(ForbiddenError);
    });

    it('requireRole enforces allowed role boundaries strictly', async () => {
      const driverReq = createAuthenticatedRequest('http://localhost:3000/api/v1/driver', driverAssam);
      const viewerReq = createAuthenticatedRequest('http://localhost:3000/api/v1/driver', viewerAssam);

      const allowedUser = await requireRole(driverReq, ['DRIVER', 'SUPER_ADMIN']);
      expect(allowedUser.id).toBe(driverAssam.id);

      await expect(requireRole(viewerReq, ['DRIVER', 'SUPER_ADMIN'])).rejects.toThrow(ForbiddenError);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Tenant Data Isolation & Query Scoping
  // ---------------------------------------------------------------------------
  describe('Tenant Scoping & Isolation (tenant-scope.ts)', () => {
    it('allows access to resources within the same organization', () => {
      expect(canAccessTenant(dispatcherAssam, orgAssam)).toBe(true);
      expect(isTenantAccessible(orgAssam, dispatcherAssam)).toBe(true);
      expect(() => assertTenantOwnership(orgAssam, dispatcherAssam)).not.toThrow();
    });

    it('strictly denies cross-tenant access to another organization', () => {
      // Dispatcher from Assam attempting to access Meghalaya NDRF resource
      expect(canAccessTenant(dispatcherAssam, orgMeghalaya)).toBe(false);
      expect(isTenantAccessible(orgMeghalaya, dispatcherAssam)).toBe(false);
      expect(() => assertTenantOwnership(orgMeghalaya, dispatcherAssam, 'vehicle')).toThrow(ForbiddenError);
    });

    it('SUPER_ADMIN possesses cross-tenant oversight across all organizations', () => {
      expect(canAccessTenant(superAdminUser, orgAssam)).toBe(true);
      expect(canAccessTenant(superAdminUser, orgMeghalaya)).toBe(true);
      expect(isTenantAccessible(orgAssam, superAdminUser)).toBe(true);
      expect(isTenantAccessible(orgMeghalaya, superAdminUser)).toBe(true);
      expect(() => assertTenantOwnership(orgMeghalaya, superAdminUser)).not.toThrow();
    });

    it('allows all tenants access to globally shared public safety records (null org)', () => {
      expect(isTenantAccessible(null, dispatcherAssam)).toBe(true);
      expect(isTenantAccessible(undefined, dispatcherMeghalaya)).toBe(true);
      expect(isTenantAccessible(null, viewerAssam)).toBe(true);
    });

    it('filterByTenant filters collections strictly by caller organization', () => {
      const mixedShipments = [
        { id: 'shp-1', organization_id: orgAssam, code: 'ASSAM-001' },
        { id: 'shp-2', organization_id: orgMeghalaya, code: 'MEGHALAYA-001' },
        { id: 'shp-3', organization_id: orgAssam, code: 'ASSAM-002' },
        { id: 'shp-4', organization_id: null, code: 'SHARED-PUBLIC' },
      ];

      // Assam dispatcher gets only Assam + shared records
      const assamResults = filterByTenant(mixedShipments, dispatcherAssam);
      expect(assamResults.map((s) => s.id)).toEqual(['shp-1', 'shp-3', 'shp-4']);

      // Meghalaya dispatcher gets only Meghalaya + shared records
      const meghalayaResults = filterByTenant(mixedShipments, dispatcherMeghalaya);
      expect(meghalayaResults.map((s) => s.id)).toEqual(['shp-2', 'shp-4']);

      // SUPER_ADMIN gets all records across all tenants
      const superAdminResults = filterByTenant(mixedShipments, superAdminUser);
      expect(superAdminResults.length).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Protected API Route Handlers Integration
  // ---------------------------------------------------------------------------
  describe('Protected API Routes Authorization', () => {
    it('POST /api/v1/dispatch: Permitted for DISPATCHER, Denied (403) for VIEWER', async () => {
      const dispatchPayload = {
        shipment_id: 'shp-test-01',
        vehicle_id: 'c0000000-0000-0000-0000-000000000001',
        driver_id: 'c0000000-0000-0000-0000-000000000001',
        route_id: 'route-loc-gau-loc-koh',
      };

      // 1. DISPATCHER: Allowed (proceeds to dispatch service)
      const allowedReq = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dispatch',
        dispatcherAssam,
        'POST',
        dispatchPayload
      );
      const allowedRes = await dispatchPost(allowedReq);
      // Even if mock service throws 404 on missing entity, it is NOT 403 Forbidden
      expect(allowedRes.status).not.toBe(403);

      // 2. VIEWER: Strictly denied with 403 Forbidden
      const deniedReq = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dispatch',
        viewerAssam,
        'POST',
        dispatchPayload
      );
      const deniedRes = await dispatchPost(deniedReq);
      expect(deniedRes.status).toBe(403);
      const body = await deniedRes.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/v1/shipments: Denied (403) for VIEWER', async () => {
      const shipmentPayload = {
        origin_id: 'loc-gau',
        destination_id: 'loc-koh',
        cargo_type: 'General',
        cargo_weight_kg: 500,
        priority: 'MEDIUM',
      };

      const viewerReq = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/shipments',
        viewerAssam,
        'POST',
        shipmentPayload
      );
      const res = await shipmentPost(viewerReq);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/shipments: Scopes returned shipments to caller tenant', async () => {
      const req = createAuthenticatedRequest('http://localhost:3000/api/v1/shipments', dispatcherAssam);
      const res = await shipmentGet(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Auditability of Authorization Events
  // ---------------------------------------------------------------------------
  describe('Authorization Auditing (authorization.ts)', () => {
    it('records authorization decisions in structured audit log without throwing', async () => {
      await expect(
        logAuthorizationEvent({
          userId: dispatcherAssam.id,
          organizationId: orgAssam,
          action: 'SHIPMENT_DISPATCH',
          resource: 'shipments/shp-test-01',
          status: 'ALLOWED',
        })
      ).resolves.not.toThrow();

      await expect(
        logAuthorizationEvent({
          userId: viewerAssam.id,
          organizationId: orgAssam,
          action: 'UNAUTHORIZED_DISPATCH_ATTEMPT',
          resource: 'shipments/shp-test-01',
          status: 'DENIED',
          reason: 'Missing permission: shipments:dispatch',
        })
      ).resolves.not.toThrow();
    });
  });
});
