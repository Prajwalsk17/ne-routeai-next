import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { alertAcknowledgeSchema, createAlertSchema, alertQuerySchema } from '@/lib/validation';
import {
  listAlerts,
  createAlert,
  acknowledgeAlert,
  AlertRecord,
} from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';
import { normalizeRole, hasPermission } from '@/lib/auth/roles';
import { AlertSeverity, AlertCategory } from '@/lib/types/alerts';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, unknown> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const parsed = alertQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { alerts, total } = await listAlerts(
      {
        status: parsed.data.status as any,
        severity: parsed.data.severity,
        category: parsed.data.category,
        shipmentId: parsed.data.shipment_id,
        tripId: parsed.data.trip_id,
        vehicleId: parsed.data.vehicle_id,
        driverId: parsed.data.driver_id,
        search: parsed.data.search,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
      },
      sessionUser
    );

    return apiSuccess(alerts, { count: total, limit: parsed.data.limit, offset: parsed.data.offset });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to query alerts';
    return apiError(msg, 'ALERT_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const role = normalizeRole(sessionUser.role);
    const body = await request.json();

    // Branch A: Alert Acknowledgment / Escalation / Resolution
    if (body.action && body.alert_id) {
      const parsed = alertAcknowledgeSchema.safeParse(body);
      if (!parsed.success) {
        return apiValidationError(parsed.error);
      }

      const updated = await acknowledgeAlert(
        {
          alertId: parsed.data.alert_id,
          action: parsed.data.action,
          notes: parsed.data.notes,
        },
        sessionUser
      );

      return apiSuccess(updated, {
        message: `Alert successfully marked as ${parsed.data.action}`,
      });
    }

    // Branch B: Alert Generation (Requires dispatch/admin clearance)
    if (!hasPermission(role, 'shipments:dispatch') && role !== 'SUPER_ADMIN' && role !== 'ORG_ADMIN') {
      return apiError('Forbidden. Missing required permission: shipments:dispatch', 'FORBIDDEN', 403);
    }

    // Format & validate creation payload
    const parsed = createAlertSchema.safeParse(body);
    if (parsed.success) {
      const newAlert = await createAlert(
        {
          title: parsed.data.title,
          message: parsed.data.message,
          severity: parsed.data.severity as AlertSeverity,
          category: parsed.data.category as AlertCategory,
          organizationId: parsed.data.organization_id || sessionUser.organizationId || undefined,
          shipmentId: parsed.data.shipment_id,
          tripId: parsed.data.trip_id,
          vehicleId: parsed.data.vehicle_id,
          driverId: parsed.data.driver_id,
          incidentId: parsed.data.incident_id,
          coordinates: parsed.data.coordinates,
          distanceToHazardKm: parsed.data.distance_to_hazard_km,
          deduplicationKey: parsed.data.deduplication_key,
          recipients: parsed.data.recipients?.map((r) => ({
            recipientId: r.recipient_id,
            recipientType: r.recipient_type,
            channel: r.channel,
            destination: r.destination,
          })),
          metadata: parsed.data.metadata,
        },
        sessionUser
      );

      return apiSuccess(newAlert, { message: 'Alert triggered and distributed' }, 201);
    }

    // Backward-compatible fallback branch for legacy payload
    if (body.shipment_id && body.vehicle_id && body.title) {
      const newAlert = await createAlert(
        {
          title: String(body.title),
          message: String(body.message || body.title),
          severity: (body.severity || 'HIGH') as AlertSeverity,
          category: (body.category || 'ROAD_HAZARD') as AlertCategory,
          shipmentId: String(body.shipment_id),
          vehicleId: String(body.vehicle_id),
          driverId: body.driver_id ? String(body.driver_id) : undefined,
          incidentId: body.incident_id ? String(body.incident_id) : undefined,
          distanceToHazardKm: typeof body.distance_to_hazard_km === 'number' ? body.distance_to_hazard_km : undefined,
          coordinates: body.coordinates,
        },
        sessionUser
      );

      return apiSuccess(newAlert, { message: 'Alert triggered and distributed' }, 201);
    }

    return apiValidationError(parsed.error);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to process alert action';
    return apiError(msg, 'ALERT_PROCESSING_ERROR', 500);
  }
}
