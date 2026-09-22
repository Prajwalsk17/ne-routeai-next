import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { listToolCallsForRun } from '@/lib/services/agent.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'data:read');
    const toolCalls = await listToolCallsForRun(params.id, user);
    return apiSuccess(toolCalls);
  } catch (error) {
    return handleApiError(error);
  }
}
