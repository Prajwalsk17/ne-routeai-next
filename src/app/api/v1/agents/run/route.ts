import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { agentRunTriggerSchema } from '@/lib/validation';
import { runAgentWorkflow } from '@/lib/services/agent.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'routes:calculate');
    const body = await request.json();

    const parsed = agentRunTriggerSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await runAgentWorkflow(parsed.data, user);
    return apiSuccess(result, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
