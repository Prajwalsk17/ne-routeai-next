import { NextRequest } from 'next/server';
import { apiSuccess, apiError, UnauthorizedError, ForbiddenError } from '@/lib/api/response';
import { getSession } from '@/lib/auth/session';
import { normalizeRole } from '@/lib/auth/roles';
import {
  listImprovementBacklog,
  addImprovementBacklogItem,
} from '@/lib/services/continuous-monitoring.service';
import { ImprovementBacklogItem } from '@/lib/types/continuous-monitoring';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') as ImprovementBacklogItem['category']) || undefined;

    const items = listImprovementBacklog(category);
    return apiSuccess({
      total: items.length,
      backlog: items,
    });
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to retrieve improvement backlog';
    return apiError(msg, 'IMPROVEMENT_BACKLOG_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSession(request);
    if (!sessionUser) {
      return apiError('Authentication required. Please sign in.', 'UNAUTHORIZED', 401);
    }

    const role = normalizeRole(sessionUser.role);
    const authorizedRoles = ['LOGISTICS_MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!authorizedRoles.includes(role)) {
      return apiError('Access denied. Only managers and administrators may add improvement backlog items.', 'FORBIDDEN', 403);
    }

    const body = await request.json();
    const { category, title, priority, impact, status, estimatedEffortDays, assignedTeam } = body;

    if (!category || !title || !priority || !impact || !assignedTeam) {
      return apiError('Missing required backlog fields: category, title, priority, impact, assignedTeam.', 'VALIDATION_ERROR', 400);
    }

    const created = addImprovementBacklogItem({
      category,
      title,
      priority,
      impact,
      status: status || 'BACKLOG',
      estimatedEffortDays: estimatedEffortDays || 3,
      assignedTeam,
    });

    return apiSuccess(created, undefined, 201);
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) return apiError(err.message, err.code, err.status);
    if (err instanceof ForbiddenError) return apiError(err.message, err.code, err.status);
    const msg = err instanceof Error ? err.message : 'Failed to create improvement backlog item';
    return apiError(msg, 'IMPROVEMENT_BACKLOG_CREATE_ERROR', 500);
  }
}
