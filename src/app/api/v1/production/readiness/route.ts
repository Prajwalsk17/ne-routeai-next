import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import {
  evaluateProductionDeploymentReadiness,
  getProductionDeployedComponents,
} from '@/lib/services/production-deployment.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const role = normalizeRole(sessionUser.role);
    const authorizedRoles = ['DISPATCHER', 'LOGISTICS_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!authorizedRoles.includes(role)) {
      return apiError(
        'Access denied. Only operations managers and administrators may inspect production deployment readiness.',
        'FORBIDDEN',
        403
      );
    }

    const scorecard = evaluateProductionDeploymentReadiness();
    const deployedComponents = getProductionDeployedComponents();

    return apiSuccess({
      scorecard,
      deployedComponents,
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to evaluate production readiness';
    return apiError(msg, 'PRODUCTION_READINESS_ERROR', 500);
  }
}
