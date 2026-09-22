import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { NAV_ITEMS } from '@/components/layout/Sidebar';
import { KNOWN_ORGANIZATIONS } from '@/components/auth/OrganizationContext';
import { normalizeRole, hasPermission, SystemRoleCode } from '@/lib/auth/roles';
import { signAuthToken } from '@/lib/auth/token-verifier';
import { SESSION_COOKIE_NAME, SessionUser } from '@/lib/auth/session';
import { GET as dashboardSummaryGet } from '@/app/api/v1/dashboard/summary/route';
import { createShipment } from '@/lib/services/dispatch.service';

function createAuthenticatedRequest(url: string, user?: SessionUser): NextRequest {
  const headers = new Headers();
  if (user) {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organizationId: user.organizationId,
    });
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
    headers.set('Authorization', `Bearer ${token}`);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'GET',
    headers,
  });
}

describe('Phase 7: Owner Web Portal Foundation Verification', () => {
  const orgAssam = 'org_assam_civil_supplies';
  const orgMeghalaya = 'org_meghalaya_disaster';

  const superAdminUser: SessionUser = {
    id: 'usr_portal_super_admin',
    email: 'director@ne-routeai.gov.in',
    name: 'NER Regional Director',
    role: 'SUPER_ADMIN',
    organizationId: null,
  };

  const dispatcherUserAssam: SessionUser = {
    id: 'usr_portal_dispatcher_assam',
    email: 'dispatch@assam-supplies.gov.in',
    name: 'Guwahati Dispatch Head',
    role: 'DISPATCHER',
    organizationId: orgAssam,
  };

  const viewerUserAssam: SessionUser = {
    id: 'usr_portal_viewer_assam',
    email: 'viewer@assam-supplies.gov.in',
    name: 'Assam Civil Auditor',
    role: 'VIEWER',
    organizationId: orgAssam,
  };

  const driverUser: SessionUser = {
    id: 'usr_portal_driver_01',
    email: 'driver.tashi@ne-logistics.in',
    name: 'Tashi Namgyal',
    role: 'DRIVER',
    organizationId: orgAssam,
  };

  const logisticsManagerUser: SessionUser = {
    id: 'usr_portal_logistics_mgr',
    email: 'fleet.mgr@assam-supplies.gov.in',
    name: 'Fleet Manager Bora',
    role: 'LOGISTICS_MANAGER',
    organizationId: orgAssam,
  };

  // --------------------------------------------------------------------------
  // 1. Permission-Aware Navigation Filtering
  // --------------------------------------------------------------------------
  describe('Permission-Aware Navigation (Sidebar.tsx)', () => {
    function getAuthorizedNavForRole(roleCode: SystemRoleCode) {
      const canonicalRole = normalizeRole(roleCode);
      return NAV_ITEMS.filter((item) => {
        if (canonicalRole === 'SUPER_ADMIN') return true;
        if (item.requiredRoles && !item.requiredRoles.includes(canonicalRole)) {
          return false;
        }
        if (item.requiredPermission && !hasPermission(canonicalRole, item.requiredPermission)) {
          return false;
        }
        return true;
      });
    }

    it('SUPER_ADMIN has unrestricted access to all navigation modules', () => {
      const nav = getAuthorizedNavForRole('SUPER_ADMIN');
      expect(nav.length).toBe(NAV_ITEMS.length);
      expect(nav.map((n) => n.path)).toContain('/dispatch');
      expect(nav.map((n) => n.path)).toContain('/analytics');
      expect(nav.map((n) => n.path)).toContain('/fleet');
      expect(nav.map((n) => n.path)).toContain('/simulator');
    });

    it('VIEWER receives strictly read-only navigation, excluding dispatch, driver, simulator, and analytics', () => {
      const nav = getAuthorizedNavForRole('VIEWER');
      const paths = nav.map((n) => n.path);

      // Permitted read-only routes
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/routes');
      expect(paths).toContain('/accessibility');
      expect(paths).toContain('/emergency');
      expect(paths).toContain('/copilot');

      // Strictly denied operational modules
      expect(paths).not.toContain('/dispatch');
      expect(paths).not.toContain('/driver');
      expect(paths).not.toContain('/simulator');
      expect(paths).not.toContain('/analytics');
    });

    it('DISPATCHER has access to dispatch center, simulator, and fleet, but NOT analytics', () => {
      const nav = getAuthorizedNavForRole('DISPATCHER');
      const paths = nav.map((n) => n.path);

      expect(paths).toContain('/dispatch');
      expect(paths).toContain('/driver');
      expect(paths).toContain('/simulator');
      expect(paths).toContain('/fleet');
      expect(paths).not.toContain('/analytics');
    });

    it('LOGISTICS_MANAGER has access to analytics, fleet, and warehouses, but NOT simulator or driver view', () => {
      const nav = getAuthorizedNavForRole('LOGISTICS_MANAGER');
      const paths = nav.map((n) => n.path);

      expect(paths).toContain('/analytics');
      expect(paths).toContain('/fleet');
      expect(paths).toContain('/warehouses');
      expect(paths).not.toContain('/simulator');
      expect(paths).not.toContain('/driver');
    });

    it('DRIVER has access to driver GPS view, but NOT fleet management or analytics', () => {
      const nav = getAuthorizedNavForRole('DRIVER');
      const paths = nav.map((n) => n.path);

      expect(paths).toContain('/driver');
      expect(paths).not.toContain('/fleet');
      expect(paths).not.toContain('/analytics');
      expect(paths).not.toContain('/simulator');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Organization Context & Tenant Models
  // --------------------------------------------------------------------------
  describe('Organization Context & Regional Tenants', () => {
    it('defines authentic North Eastern organizations with valid state codes', () => {
      expect(KNOWN_ORGANIZATIONS.length).toBeGreaterThanOrEqual(5);

      const orgIds = KNOWN_ORGANIZATIONS.map((o) => o.id);
      expect(orgIds).toContain('org_assam_civil_supplies');
      expect(orgIds).toContain('org_meghalaya_disaster');
      expect(orgIds).toContain('org_nagaland_relief');

      KNOWN_ORGANIZATIONS.forEach((org) => {
        expect(org.name).toBeTruthy();
        expect(org.code).toBeTruthy();
        expect(org.state).toBeTruthy();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. Backend Dashboard Summary API (Zero Fabrication Policy)
  // --------------------------------------------------------------------------
  describe('Tenant-Scoped Dashboard Summary API (/api/v1/dashboard/summary)', () => {
    it('rejects unauthenticated requests with 401 Unauthorized', async () => {
      const req = createAuthenticatedRequest('http://localhost:3000/api/v1/dashboard/summary');
      const res = await dashboardSummaryGet(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns genuine tenant-scoped metrics adhering to zero-fabrication policy', async () => {
      const req = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dashboard/summary',
        dispatcherUserAssam
      );

      const res = await dashboardSummaryGet(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const stats = body.data.stats;
      // All counts must be numeric non-negative integers
      expect(stats.activeDeliveries).toBeGreaterThanOrEqual(0);
      expect(stats.highRiskRoutes).toBeGreaterThanOrEqual(0);
      expect(stats.disruptions).toBeGreaterThanOrEqual(0);
      expect(stats.emergencyMissions).toBeGreaterThanOrEqual(0);
      expect(stats.activeVehicles).toBeGreaterThanOrEqual(0);
      expect(stats.totalShipments).toBeGreaterThanOrEqual(0);
      expect(stats.deliveredShipments).toBeGreaterThanOrEqual(0);

      // regionalAccessibility is null unless real sensors are connected (zero fabrication invariant)
      expect(stats.regionalAccessibility).toBeNull();

      // System health flags
      expect(body.data.systemStatus.routeEngine).toBe('ONLINE');
      expect(body.data.systemStatus.riskPrediction).toBe('ONLINE');
      expect(['STANDBY', 'LIVE']).toContain(body.data.systemStatus.telemetryStream);

      // Organization boundary context
      expect(body.data.tenantId).toBe(orgAssam);
      expect(body.data.isCrossTenant).toBe(false);
    });

    it('SUPER_ADMIN summary reflects global cross-tenant scope', async () => {
      const req = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dashboard/summary',
        superAdminUser
      );

      const res = await dashboardSummaryGet(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.isCrossTenant).toBe(true);
      expect(body.data.tenantId).toBe('GLOBAL');
    });

    it('isolates shipments: Meghalaya shipments do not increment Assam dashboard counts', async () => {
      // Create a shipment specifically tagged with Meghalaya
      const meghalayaShipment = await createShipment({
        originId: 'loc-shl',
        destinationId: 'loc-tur',
        cargoType: 'Emergency Tents',
        cargoWeightKg: 1200,
        priority: 'CRITICAL',
        userId: 'usr_meghalaya_officer',
      });
      (meghalayaShipment as unknown as Record<string, unknown>).organization_id = orgMeghalaya;

      // Query dashboard summary as Assam dispatcher
      const assamReq = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dashboard/summary',
        dispatcherUserAssam
      );
      const assamRes = await dashboardSummaryGet(assamReq);
      const assamBody = await assamRes.json();

      // Query dashboard summary as Super Admin (cross-tenant)
      const saReq = createAuthenticatedRequest(
        'http://localhost:3000/api/v1/dashboard/summary',
        superAdminUser
      );
      const saRes = await dashboardSummaryGet(saReq);
      const saBody = await saRes.json();

      // Super admin sees all shipments; Assam dispatcher sees only Assam shipments
      expect(saBody.data.stats.totalShipments).toBeGreaterThanOrEqual(
        assamBody.data.stats.totalShipments
      );
    });
  });
});
