import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { createAccessibilityDeclarationSchema, accessibilityQuerySchema } from '@/lib/validation';
import { listAccessibilityDeclarations, createAccessibilityDeclaration } from '@/lib/services/accessibility.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'data:read');
    const { searchParams } = new URL(request.url);

    const queryInput = {
      tier: searchParams.get('tier') || undefined,
      state: searchParams.get('state') || undefined,
      district: searchParams.get('district') || undefined,
      is_active: searchParams.get('is_active') !== null ? searchParams.get('is_active') === 'true' : undefined,
      freshness: searchParams.get('freshness') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    };

    const parsed = accessibilityQuerySchema.safeParse(queryInput);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const result = await listAccessibilityDeclarations(parsed.data as any);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    const body = await request.json();

    const parsed = createAccessibilityDeclarationSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const declaration = await createAccessibilityDeclaration(
      {
        declarationCode: parsed.data.declaration_code,
        settlementName: parsed.data.settlement_name,
        district: parsed.data.district,
        state: parsed.data.state,
        coordinates: {
          lat: parsed.data.latitude,
          lng: parsed.data.longitude,
        },
        previousTier: parsed.data.previous_tier as any,
        newTier: parsed.data.new_tier as any,
        reason: parsed.data.reason,
        declaringAuthority: parsed.data.declaring_authority,
        effectiveFrom: parsed.data.effective_from,
        estimatedRestoration: parsed.data.estimated_restoration || null,
        isActive: true,
        resolvedAt: null,
        resolutionNotes: null,
        provenance: {
          sourceProvider: 'GOV_DISASTER_PORTAL',
          sourceCode: parsed.data.declaring_authority,
          verifiedAt: new Date().toISOString(),
        },
      },
      user.id
    );

    return apiSuccess(declaration, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
