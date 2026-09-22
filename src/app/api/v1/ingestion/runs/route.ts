import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { listIngestionRuns } from '@/lib/services/ingestion.service';
import { IngestionStatus } from '@/lib/types/ingestion';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const dataSourceId = searchParams.get('data_source_id') || undefined;
    const dataSourceCode = searchParams.get('data_source_code') || undefined;
    const status = (searchParams.get('status') as IngestionStatus) || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const { runs, total } = await listIngestionRuns({
      dataSourceId,
      dataSourceCode,
      status,
      limit,
      offset,
    });

    return apiSuccess({
      runs,
      total,
      limit,
      offset,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
