import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError, apiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import {
  getMission,
  acceptMission,
  modifyMission,
  overrideMission,
  executeAction,
} from '@/lib/services/emergency.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuthenticatedUser(request);
    const mission = getMission(params.id);

    if (!mission) {
      return apiError(`Mission ${params.id} not found`, 'NOT_FOUND', 404);
    }

    return apiSuccess(mission);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({}));
    const action = body.action as 'accept' | 'modify' | 'override' | 'execute_action';

    if (!action) {
      return apiError('Operation action is required (accept, modify, override, execute_action)', 'VALIDATION_ERROR', 400);
    }

    const actor = user.name || user.email || 'Duty Dispatcher';

    if (action === 'accept') {
      const result = await acceptMission(params.id, actor);
      if (!result.success) {
        return apiError(result.error || 'Failed to accept mission', 'ACCEPT_ERROR', 400);
      }
      return apiSuccess(result.mission, {
        message: `Emergency response plan ${params.id} accepted. Downstream convoy clearance active.`,
      });
    }

    if (action === 'modify') {
      const result = await modifyMission(
        params.id,
        {
          priority: body.priority,
          corridor: body.corridor,
          transportMode: body.transportMode,
          cargoType: body.cargoType,
          destination: body.destination,
          resources: body.resources,
          agencies: body.agencies,
          notes: body.notes,
          actions: body.actions,
        },
        actor
      );
      if (!result.success) {
        return apiError(result.error || 'Failed to modify mission', 'MODIFY_ERROR', 400);
      }
      return apiSuccess(result.mission, {
        message: `Emergency mission ${params.id} successfully modified and recalculated.`,
      });
    }

    if (action === 'override') {
      if (!body.reason) {
        return apiError('Override reason is required.', 'VALIDATION_ERROR', 400);
      }
      const result = await overrideMission(
        params.id,
        {
          reason: body.reason,
          justification: body.justification || '',
          decision: body.decision || 'Operator manual intervention',
        },
        actor
      );
      if (!result.success) {
        return apiError(result.error || 'Failed to override mission', 'OVERRIDE_ERROR', 400);
      }
      return apiSuccess(result.mission, {
        message: `AI recommendation overridden by operator ${actor}.`,
      });
    }

    if (action === 'execute_action') {
      if (!body.actionId) {
        return apiError('actionId is required for execution', 'VALIDATION_ERROR', 400);
      }
      const result = await executeAction(params.id, body.actionId, actor);
      if (!result.success) {
        return apiError(result.error || 'Failed to execute action', 'EXECUTE_ERROR', 400);
      }
      return apiSuccess(
        {
          action: result.action,
          mission: result.mission,
          notice: result.notice,
          isExternalAgency: result.isExternalAgency,
        },
        { message: result.notice }
      );
    }

    return apiError(`Unsupported action: ${action}`, 'BAD_REQUEST', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
