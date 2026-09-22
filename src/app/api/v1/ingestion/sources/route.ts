import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { createDataSourceSchema } from '@/lib/validation';
import { listDataSources, registerDataSource } from '@/lib/services/ingestion.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const isActive = searchParams.get('is_active') !== null
      ? searchParams.get('is_active') === 'true'
      : undefined;
    const providerType = searchParams.get('provider_type') || undefined;
    const state = searchParams.get('state') || undefined;

    const sources = await listDataSources({
      isActive,
      providerType,
      state,
    });

    return apiSuccess({
      sources,
      total: sources.length,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    const body = await request.json();

    const parsed = createDataSourceSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const source = await registerDataSource(parsed.data, user);
    return apiSuccess(source, {
      status: 201,
      message: `Authoritative data source ${source.code} registered successfully`,
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
