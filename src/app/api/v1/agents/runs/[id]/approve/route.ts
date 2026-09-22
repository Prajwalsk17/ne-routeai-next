import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { agentApproveSchema } from '@/lib/validation';
import { approveAgentRun } from '@/lib/services/agent.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json().catch(() => ({}));

    const parsed = agentApproveSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const run = await approveAgentRun(params.id, parsed.data.comments, user);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
