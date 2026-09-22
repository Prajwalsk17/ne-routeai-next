import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { agentRunQuerySchema } from '@/lib/validation';
import { listAgentRuns } from '@/lib/services/agent.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      agent_name: searchParams.get('agent_name') || undefined,
      status: searchParams.get('status') || undefined,
      trigger_event: searchParams.get('trigger_event') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = agentRunQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await listAgentRuns(parsed.data, user);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
