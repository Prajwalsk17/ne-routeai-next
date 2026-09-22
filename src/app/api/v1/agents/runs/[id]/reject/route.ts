import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { agentRejectSchema } from '@/lib/validation';
import { rejectAgentRun } from '@/lib/services/agent.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'shipments:dispatch');
    const body = await request.json().catch(() => ({}));

    const parsed = agentRejectSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const rejectionReason = parsed.data.rejection_reason || parsed.data.reason || 'Rejected by dispatcher';
    const run = await rejectAgentRun(params.id, rejectionReason, user);
    return apiSuccess(run);
  } catch (error) {
    return handleApiError(error);
  }
}
