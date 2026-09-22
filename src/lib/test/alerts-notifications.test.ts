/**
 * AuraNER / NER-Route AI — Phase 20: Alerts & Notifications Test Suite
 * 
 * Tests:
 * 1. Alert creation across severity levels (LOW, MEDIUM, HIGH, CRITICAL)
 * 2. Multi-channel recipient resolution (Driver FCM Push, Dispatcher In-App/Broadcast)
 * 3. Intelligent deduplication within temporal cooldown window
 * 4. Delivery status lifecycle and retry mechanism on simulated provider failure
 * 5. Acknowledgement, escalation, resolution, and dismissal workflows
 * 6. Multi-tenant isolation and cross-organization boundary protection
 * 7. REST API endpoints RBAC authorization and 403 Forbidden enforcement
 * 8. Backward-compatibility with legacy route alerts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SessionUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { signAuthToken } from '@/lib/auth/token-verifier';
import {
  createAlert,
  acknowledgeAlert,
  getAlertById,
  listAlerts,
  sendDirectNotification,
  listNotifications,
  getNotificationById,
  markNotificationAsRead,
  retryNotification,
  createRouteAlert,
  acknowledgeRouteAlert,
  getActiveAlertsForShipment,
  _resetAlertStore,
} from '@/lib/services/alert.service';
import {
  clearDispatchedNotificationsForTesting,
  getDispatchedNotificationsForTesting,
  setSimulateFailureForTesting,
} from '@/lib/providers/notification.provider';
import { POST as postAlertsRoute, GET as getAlertsRoute } from '@/app/api/v1/alerts/route';
import { GET as getAlertDetailRoute } from '@/app/api/v1/alerts/[id]/route';
import { POST as postAcknowledgeRoute } from '@/app/api/v1/alerts/[id]/acknowledge/route';
import { GET as getNotificationsRoute, POST as postNotificationsRoute } from '@/app/api/v1/notifications/route';
import { POST as postReadNotificationRoute } from '@/app/api/v1/notifications/[id]/read/route';
import { POST as postRetryNotificationRoute } from '@/app/api/v1/notifications/[id]/retry/route';

// Test Actors
const dispatcherAssam: SessionUser = {
  id: 'usr_disp_assam',
  email: 'dispatcher@assam.gov.in',
  name: 'Pranab Bora',
  role: 'DISPATCHER',
  organizationId: 'org_assam_civil_supplies',
};

const adminNagaland: SessionUser = {
  id: 'usr_adm_nagaland',
  email: 'admin@nagaland.gov.in',
  name: 'Temjen Imna',
  role: 'ORG_ADMIN',
  organizationId: 'org_nagaland_relief',
};

const viewerAssam: SessionUser = {
  id: 'usr_view_assam',
  email: 'viewer@assam.gov.in',
  name: 'Dhiren Das',
  role: 'VIEWER',
  organizationId: 'org_assam_civil_supplies',
};

function createMockRequest(
  method: string,
  url: string,
  user?: SessionUser,
  body?: unknown
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (user) {
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    });
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
    headers.set('Authorization', `Bearer ${token}`);
  }

  const reqInit: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}

describe('Phase 20: Alerts & Notifications Architecture', () => {
  beforeEach(() => {
    _resetAlertStore();
    clearDispatchedNotificationsForTesting();
  });

  // ---------------------------------------------------------------------------
  // 1. Alert Creation & Severity Classification
  // ---------------------------------------------------------------------------
  describe('Alert Creation & Severity Classification', () => {
    it('creates high-severity alert with cryptographic SHA-256 provenance', async () => {
      const alert = await createAlert(
        {
          title: 'NH-29 Zubza Pass Landslide',
          message: 'Both highway lanes blocked by heavy debris. Road impassable.',
          severity: 'HIGH',
          category: 'ROAD_HAZARD',
          shipmentId: 'shp-5301',
          vehicleId: 'veh-as-01-4001',
          driverId: 'drv-dorjee',
          distanceToHazardKm: 3.5,
          coordinates: { lat: 25.75, lng: 94.02 },
        },
        dispatcherAssam
      );

      expect(alert.id).toBeDefined();
      expect(alert.alertCode).toMatch(/^ALT-\d{4}$/);
      expect(alert.severity).toBe('HIGH');
      expect(alert.category).toBe('ROAD_HAZARD');
      expect(alert.organizationId).toBe(dispatcherAssam.organizationId);
      expect(alert.provenanceHash).toBeDefined();
      expect(alert.provenanceHash).toHaveLength(64); // SHA-256 hex
      expect(alert.recipients.length).toBeGreaterThan(0);
      expect(alert.recipients[0].channel).toBe('PUSH');
      expect(alert.recipients[0].status).toBe('DELIVERED');
    });

    it('creates CRITICAL alert and automatically triggers dispatcher emergency broadcast', async () => {
      const alert = await createAlert(
        {
          title: 'Flash Flood Bridge Collapse',
          message: 'Dhansiri river bridge structural failure. Immediate halt required.',
          severity: 'CRITICAL',
          category: 'ROAD_HAZARD',
          tripId: 'trp-901',
          driverId: 'drv-dorjee',
        },
        dispatcherAssam
      );

      expect(alert.severity).toBe('CRITICAL');
      // Must target both the driver and the emergency dispatcher broadcast channel
      const driverRecipient = alert.recipients.find((r) => r.recipientType === 'DRIVER');
      const dispatcherRecipient = alert.recipients.find((r) => r.recipientType === 'DISPATCHER');

      expect(driverRecipient).toBeDefined();
      expect(driverRecipient?.channel).toBe('PUSH');
      expect(dispatcherRecipient).toBeDefined();
      expect(dispatcherRecipient?.channel).toBe('IN_APP');

      const dispatched = getDispatchedNotificationsForTesting();
      expect(dispatched.length).toBe(2);
      expect(dispatched.some((d) => d.priority === 'CRITICAL')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Intelligent Deduplication
  // ---------------------------------------------------------------------------
  describe('Intelligent Deduplication & Flood Prevention', () => {
    it('deduplicates identical active alerts within cooldown window to prevent notification spam', async () => {
      const payload = {
        title: 'Barapani Mudslide Warning',
        message: 'Active mudflow across kilometer marker 42',
        severity: 'MEDIUM' as const,
        category: 'WEATHER_DISRUPTION' as const,
        vehicleId: 'veh-as-01-4001',
      };

      // 1. First trigger
      const alert1 = await createAlert(payload, dispatcherAssam);
      expect(alert1.id).toBeDefined();

      const notifsAfterFirst = getDispatchedNotificationsForTesting().length;

      // 2. Immediate duplicate trigger (e.g. repeated sensor reading)
      const alert2 = await createAlert(payload, dispatcherAssam);

      // Returns the existing active alert without creating duplicate or re-spamming
      expect(alert2.id).toBe(alert1.id);
      expect(alert2.alertCode).toBe(alert1.alertCode);
      expect(getDispatchedNotificationsForTesting().length).toBe(notifsAfterFirst);
    });

    it('creates distinct alert when explicit deduplication key differs', async () => {
      const alert1 = await createAlert(
        {
          title: 'Sector Alpha Check',
          message: 'Routine clearance report',
          severity: 'LOW',
          category: 'SYSTEM',
          deduplicationKey: 'sensor-checkpoint-1',
        },
        dispatcherAssam
      );

      const alert2 = await createAlert(
        {
          title: 'Sector Beta Check',
          message: 'Routine clearance report',
          severity: 'LOW',
          category: 'SYSTEM',
          deduplicationKey: 'sensor-checkpoint-2',
        },
        dispatcherAssam
      );

      expect(alert1.id).not.toBe(alert2.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Delivery Status & Failure Handling / Retries
  // ---------------------------------------------------------------------------
  describe('Delivery Status & Failure Handling / Retries', () => {
    it('retries notification dispatch on transient network failure up to max retries', async () => {
      // Configure 2 simulated transient failures before succeeding on attempt 3
      setSimulateFailureForTesting(true, 2);

      const notif = await sendDirectNotification(
        {
          recipientId: 'drv-dorjee',
          recipientType: 'DRIVER',
          channel: 'PUSH',
          destination: 'fcm_token_dorjee_khandu_9921',
          title: 'Route Diversion Assigned',
          body: 'Proceed via Dimapur bypass due to highway rockfall',
          priority: 'HIGH',
        },
        dispatcherAssam
      );

      // The service retry loop executed 3 attempts and succeeded
      expect(notif.deliveryAttempts).toBe(3);
      expect(notif.status).toBe('DELIVERED');
      expect(notif.deliveredAt).toBeDefined();
    });

    it('marks notification as FAILED when provider persistently errors beyond max retries', async () => {
      // Fail permanently (10 times)
      setSimulateFailureForTesting(true, 10);

      const notif = await sendDirectNotification(
        {
          recipientId: 'drv-dorjee',
          recipientType: 'DRIVER',
          channel: 'PUSH',
          destination: 'fcm_token_offline_device',
          title: 'Urgent Weather Advisory',
          body: 'Severe cyclone warning in coastal sector',
          priority: 'CRITICAL',
        },
        dispatcherAssam
      );

      expect(notif.deliveryAttempts).toBe(3); // Max retries
      expect(notif.status).toBe('FAILED');
      expect(notif.failureReason).toContain('UNREGISTERED_OR_TIMEOUT');

      // Now test manual retry when network recovers
      setSimulateFailureForTesting(false);
      const retried = await retryNotification(notif.id, dispatcherAssam);
      expect(retried.status).toBe('DELIVERED');
      expect(retried.deliveredAt).toBeDefined();
    });

    it('marks notification as read by user', async () => {
      const notif = await sendDirectNotification(
        {
          recipientId: 'drv-dorjee',
          recipientType: 'DRIVER',
          channel: 'IN_APP',
          destination: 'drv-dorjee',
          title: 'Daily Logistics Briefing',
          body: 'Assam Civil Supplies manifest loaded',
        },
        dispatcherAssam
      );

      expect(notif.isRead).toBe(false);
      const readNotif = await markNotificationAsRead(notif.id, dispatcherAssam);
      expect(readNotif.isRead).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Alert Lifecycle: Acknowledgement, Escalation, Resolution & Dismissal
  // ---------------------------------------------------------------------------
  describe('Alert Lifecycle: Acknowledgement, Escalation, Resolution & Dismissal', () => {
    it('allows dispatcher to acknowledge an active alert', async () => {
      const alert = await createAlert(
        {
          title: 'Heavy Fog Advisory',
          message: 'Visibility below 50m in Shillong peak pass',
          severity: 'MEDIUM',
          category: 'WEATHER_DISRUPTION',
        },
        dispatcherAssam
      );

      expect(alert.status).toBe('SENT');

      const ack = await acknowledgeAlert(
        {
          alertId: alert.id,
          action: 'ACKNOWLEDGE',
          notes: 'Driver advised to reduce convoy speed to 25 km/h',
        },
        dispatcherAssam
      );

      expect(ack.status).toBe('ACKNOWLEDGED');
      expect(ack.acknowledgedBy).toBe(dispatcherAssam.id);
      expect(ack.acknowledgedAt).toBeDefined();
    });

    it('allows escalating alert to emergency status', async () => {
      const alert = await createAlert(
        {
          title: 'Suspected Fuel Tank Leak',
          message: 'Vehicle reporting sudden drop in fuel pressure',
          severity: 'HIGH',
          category: 'VEHICLE_BREAKDOWN',
        },
        dispatcherAssam
      );

      const escalated = await acknowledgeAlert(
        {
          alertId: alert.id,
          action: 'ESCALATE',
          notes: 'Escalating to state recovery team for emergency tow',
        },
        dispatcherAssam
      );

      expect(escalated.status).toBe('ESCALATED');
      expect(escalated.escalatedAt).toBeDefined();
    });

    it('allows resolving alert with resolution notes', async () => {
      const alert = await createAlert(
        {
          title: 'Bridge Load Limit Warning',
          message: 'Bailey bridge single vehicle weight restriction',
          severity: 'MEDIUM',
          category: 'ROAD_HAZARD',
        },
        dispatcherAssam
      );

      const resolved = await acknowledgeAlert(
        {
          alertId: alert.id,
          action: 'RESOLVE',
          notes: 'Vehicle crossed safely; sector completed',
        },
        dispatcherAssam
      );

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).toBeDefined();
      expect(resolved.resolutionNotes).toBe('Vehicle crossed safely; sector completed');
    });

    it('allows dismissing false alarms', async () => {
      const alert = await createAlert(
        {
          title: 'Erroneous Geofence Alarm',
          message: 'GPS bounce triggered false corridor exit',
          severity: 'LOW',
          category: 'GEOFENCE_DEVIATION',
        },
        dispatcherAssam
      );

      const dismissed = await acknowledgeAlert(
        {
          alertId: alert.id,
          action: 'DISMISS',
          notes: 'False alarm caused by canyon GPS multipath reflection',
        },
        dispatcherAssam
      );

      expect(dismissed.status).toBe('DISMISSED');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Tenancy & Boundary Protection
  // ---------------------------------------------------------------------------
  describe('Multi-Tenancy & Organization Isolation', () => {
    it('prevents cross-tenant viewing or acknowledgement of alerts', async () => {
      const assamAlert = await createAlert(
        {
          title: 'Assam Civil Supplies High Priority Alert',
          message: 'Guwahati depot dock 3 operational delay',
          severity: 'MEDIUM',
          category: 'OPERATIONAL_DELAY',
        },
        dispatcherAssam
      );

      // Nagaland Admin queries alerts
      const nagalandList = await listAlerts({}, adminNagaland);
      expect(nagalandList.alerts.some((a) => a.id === assamAlert.id)).toBe(false);

      // Direct ID lookup across tenants fails
      await expect(getAlertById(assamAlert.id, adminNagaland)).rejects.toThrow(
        'Tenant access denied'
      );

      // Cross-tenant acknowledgement fails
      await expect(
        acknowledgeAlert({ alertId: assamAlert.id, action: 'ACKNOWLEDGE' }, adminNagaland)
      ).rejects.toThrow('Tenant access denied');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. REST API Endpoints & RBAC Protection
  // ---------------------------------------------------------------------------
  describe('REST API Endpoints & RBAC Protection', () => {
    it('POST /api/v1/alerts creates alert for authorized dispatcher', async () => {
      const req = createMockRequest('POST', '/api/v1/alerts', dispatcherAssam, {
        title: 'National Highway 37 Mudflow Warning',
        message: 'Mudflow near Kaziranga forest reserve sector',
        severity: 'HIGH',
        category: 'ROAD_HAZARD',
        distance_to_hazard_km: 4.2,
      });

      const res = await postAlertsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('National Highway 37 Mudflow Warning');
      expect(json.data.severity).toBe('HIGH');
    });

    it('POST /api/v1/alerts returns 403 Forbidden for viewer role', async () => {
      const req = createMockRequest('POST', '/api/v1/alerts', viewerAssam, {
        title: 'Attempted Alert Creation',
        message: 'Viewer trying to broadcast an alert',
        severity: 'HIGH',
      });

      const res = await postAlertsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('GET /api/v1/alerts returns paginated alert records for authenticated user', async () => {
      await createAlert({ title: 'Alert 1', message: 'Test message', severity: 'LOW', category: 'SYSTEM' }, dispatcherAssam);
      await createAlert({ title: 'Alert 2', message: 'Test message', severity: 'HIGH', category: 'SYSTEM' }, dispatcherAssam);

      const req = createMockRequest('GET', '/api/v1/alerts?limit=10', dispatcherAssam);
      const res = await getAlertsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/v1/alerts/[id] returns detail of existing alert', async () => {
      const alert = await createAlert(
        { title: 'Passage Cleared', message: 'Road now open for convoy', severity: 'LOW', category: 'SYSTEM' },
        dispatcherAssam
      );

      const req = createMockRequest('GET', `/api/v1/alerts/${alert.id}`, dispatcherAssam);
      const res = await getAlertDetailRoute(req, { params: { id: alert.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(alert.id);
    });

    it('POST /api/v1/alerts/[id]/acknowledge handles acknowledgement', async () => {
      const alert = await createAlert(
        { title: 'Fuel Warning', message: 'Check fuel level at next depot', severity: 'MEDIUM', category: 'OPERATIONAL_DELAY' },
        dispatcherAssam
      );

      const req = createMockRequest('POST', `/api/v1/alerts/${alert.id}/acknowledge`, dispatcherAssam, {
        action: 'ACKNOWLEDGE',
        notes: 'Acknowledged by dispatcher on shift',
      });

      const res = await postAcknowledgeRoute(req, { params: { id: alert.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ACKNOWLEDGED');
    });

    it('GET /api/v1/notifications queries notifications feed', async () => {
      await sendDirectNotification(
        {
          recipientId: 'drv-dorjee',
          recipientType: 'DRIVER',
          channel: 'PUSH',
          destination: 'token-dorjee',
          title: 'Trip Update',
          body: 'Stop sequence updated',
        },
        dispatcherAssam
      );

      const req = createMockRequest('GET', '/api/v1/notifications?recipient_id=drv-dorjee', dispatcherAssam);
      const res = await getNotificationsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/notifications/[id]/read marks notification as read', async () => {
      const notif = await sendDirectNotification(
        {
          recipientId: 'drv-dorjee',
          recipientType: 'DRIVER',
          channel: 'IN_APP',
          destination: 'drv-dorjee',
          title: 'Safety Reminder',
          body: 'Check wheel chocks on mountain slopes',
        },
        dispatcherAssam
      );

      const req = createMockRequest('POST', `/api/v1/notifications/${notif.id}/read`, dispatcherAssam);
      const res = await postReadNotificationRoute(req, { params: { id: notif.id } });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.isRead).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Backward Compatibility with Existing Callers
  // ---------------------------------------------------------------------------
  describe('Backward Compatibility with Legacy Callers', () => {
    it('maintains compatibility with createRouteAlert and getActiveAlertsForShipment', async () => {
      const alert = await createRouteAlert({
        shipmentId: 'shp-legacy-101',
        vehicleId: 'veh-legacy-202',
        driverId: 'drv-legacy-303',
        type: 'LANDSLIDE',
        severity: 'CRITICAL',
        title: 'Zubza Mountain Pass Landslide',
        message: 'Both highway lanes obstructed by rockfall 3.2 km ahead.',
        distanceToHazardKm: 3.2,
      });

      expect(alert.id).toBeDefined();
      expect(alert.shipmentId).toBe('shp-legacy-101');
      expect(alert.severity).toBe('CRITICAL');

      const activeAlerts = await getActiveAlertsForShipment('shp-legacy-101');
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts[0].id).toBe(alert.id);

      const acknowledged = await acknowledgeRouteAlert(alert.id, 'usr-test', 'ACKNOWLEDGE', 'Noted by driver');
      expect(acknowledged?.status).toBe('ACKNOWLEDGED');
    });
  });
});
