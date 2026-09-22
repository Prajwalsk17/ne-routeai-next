import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import {
  listMonitoringAlerts,
  acknowledgeMonitoringAlert,
} from '@/lib/services/continuous-monitoring.service';
import { OperationalVectorKey, MonitoringAlertSeverity } from '@/lib/types/continuous-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const vector = (searchParams.get('vector') as OperationalVectorKey) || undefined;
    const severity = (searchParams.get('severity') as MonitoringAlertSeverity) || undefined;
    const acknowledged = searchParams.get('acknowledged')
      ? searchParams.get('acknowledged') === 'true'
      : undefined;

    const alerts = listMonitoringAlerts({ vector, severity, acknowledged });
    return apiSuccess({
      total: alerts.length,
      alerts,
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve monitoring alerts';
    return apiError(msg, 'MONITORING_ALERTS_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const role = normalizeRole(sessionUser.role);
    const authorizedRoles = ['DISPATCHER', 'LOGISTICS_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!authorizedRoles.includes(role)) {
      return apiError('Access denied. Insufficient permissions to acknowledge monitoring alerts.', 'FORBIDDEN', 403);
    }

    const body = await request.json();
    const { alertId } = body;
    if (!alertId) {
      return apiError('alertId is required in request body.', 'VALIDATION_ERROR', 400);
    }

    const success = acknowledgeMonitoringAlert(alertId);
    if (!success) {
      return apiError(`Alert ${alertId} not found.`, 'NOT_FOUND', 404);
    }

    return apiSuccess({
      acknowledged: true,
      alertId,
      acknowledgedBy: sessionUser.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to acknowledge monitoring alert';
    return apiError(msg, 'MONITORING_ALERT_ACK_ERROR', 500);
  }
}
