import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { syncBatchRequestSchema } from '@/lib/validation';
import { processSyncBatch } from '@/lib/services/sync.service';

export async function POST(request: NextRequest) {
  try {
    // Both drivers and dispatchers can sync field outbox batches
    const user = await requirePermission(request, 'telemetry:write');
    const body = await request.json();

    const parsed = syncBatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const organizationId = user.organizationId || parsed.data.organization_id;
    if (!organizationId && user.role !== 'SUPER_ADMIN') {
      return apiValidationError({
        issues: [{ path: ['organization_id'], message: 'Caller must belong to an organization' }],
      } as any);
    }

    const result = await processSyncBatch(
      organizationId || '',
      {
        deviceId: parsed.data.device_id,
        driverId: parsed.data.driver_id || user.id,
        organizationId: organizationId || '',
        operations: parsed.data.operations.map((op) => ({
          id: op.id,
          type: op.type,
          entityId: op.entity_id,
          payload: op.payload,
          clientTimestamp: op.client_timestamp,
          version: op.version,
          retryCount: 0,
          status: 'QUEUED',
        })),
      },
      user
    );

    return apiSuccess(result, {
      message: `Batch sync completed: ${result.syncedCount} synced, ${result.conflictCount} conflicts, ${result.failedCount} failed`,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
