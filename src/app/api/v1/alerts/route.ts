import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError } from '@/lib/api/response';
import { alertAcknowledgeSchema } from '@/lib/validation';
import {
  getActiveAlertsForShipment,
  acknowledgeRouteAlert,
  createRouteAlert,
  RouteAlertRecord,
} from '@/lib/services/alert.service';
import { getSession } from '@/lib/auth/session';
import { SeverityLevel } from '@/lib/services/risk.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id') || undefined;
    const vehicleId = searchParams.get('vehicle_id') || undefined;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    let alerts: RouteAlertRecord[] = await getActiveAlertsForShipment(shipmentId);

    if (vehicleId) {
      alerts = alerts.filter((a) => a.vehicleId === vehicleId);
    }
    if (status) {
      if (status === 'ACTIVE') {
        alerts = alerts.filter((a) => a.status === 'SENT' || a.status === 'DELIVERED' || a.status === 'ESCALATED');
      } else {
        alerts = alerts.filter((a) => a.status === status);
      }
    }
    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    return apiSuccess(alerts, { count: alerts.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to query alerts';
    return apiError(msg, 'ALERT_QUERY_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionUser = await getSession(request);

    // Branch A: Alert Acknowledgment / Escalation / Resolution
    if (body.action && body.alert_id) {
      const parsed = alertAcknowledgeSchema.safeParse(body);
      if (!parsed.success) {
        return apiValidationError(parsed.error);
      }

      const updated = await acknowledgeRouteAlert(
        parsed.data.alert_id,
        sessionUser?.id || null,
        parsed.data.action,
        parsed.data.notes
      );

      if (!updated) {
        return apiError('Alert record not found', 'ALERT_NOT_FOUND', 404);
      }

      return apiSuccess(updated, {
        message: `Alert successfully marked as ${parsed.data.action}`,
      });
    }

    // Branch B: Dispatcher / System Manual Alert Creation
    if (body.shipment_id && body.vehicle_id && body.title) {
      const newAlert = await createRouteAlert({
        shipmentId: String(body.shipment_id),
        vehicleId: String(body.vehicle_id),
        driverId: body.driver_id ? String(body.driver_id) : undefined,
        incidentId: body.incident_id ? String(body.incident_id) : undefined,
        type: String(body.type || 'HAZARD_WARNING'),
        severity: (body.severity || 'HIGH') as SeverityLevel,
        title: String(body.title),
        message: String(body.message || body.title),
        distanceToHazardKm: typeof body.distance_to_hazard_km === 'number' ? body.distance_to_hazard_km : undefined,
        coordinates: body.coordinates,
      });

      return apiSuccess(newAlert, { message: 'Alert triggered and distributed' }, 201);
    }

    return apiError(
      'Invalid payload: expected alert_id and action for acknowledgment, or shipment_id, vehicle_id, and title for alert generation',
      'INVALID_ALERT_PAYLOAD',
      400
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process alert action';
    return apiError(msg, 'ALERT_PROCESSING_ERROR', 500);
  }
}
