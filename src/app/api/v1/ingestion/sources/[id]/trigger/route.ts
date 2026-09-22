import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { triggerIngestionRunSchema } from '@/lib/validation';
import { executeIngestionRun } from '@/lib/services/ingestion.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = triggerIngestionRunSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await executeIngestionRun(params.id, {
      triggerMode: 'MANUAL',
      triggeredBy: user.id,
      dryRun: parsed.data.dry_run,
      force: parsed.data.force,
    });

    return apiSuccess(result, {
      message: `Ingestion run ${result.run.id} finished with status ${result.run.status}: ${result.run.recordsIngested} ingested, ${result.run.recordsRejected} rejected, ${result.run.recordsSkippedDuplicate} duplicates`,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
