import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { ingestionEventQuerySchema } from '@/lib/validation';
import { queryIngestedEvents } from '@/lib/services/ingestion.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      event_type: searchParams.get('event_type') || 'all',
      state: searchParams.get('state') || undefined,
      highway_code: searchParams.get('highway_code') || undefined,
      freshness: searchParams.get('freshness') || undefined,
      is_severe: searchParams.get('is_severe') !== null
        ? searchParams.get('is_severe') === 'true'
        : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = ingestionEventQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await queryIngestedEvents(parsed.data);
    return apiSuccess(result);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
