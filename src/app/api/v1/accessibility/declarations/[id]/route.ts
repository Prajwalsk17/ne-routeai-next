import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { updateAccessibilityDeclarationSchema } from '@/lib/validation';
import {
  getAccessibilityDeclarationById,
  updateAccessibilityDeclaration,
  resolveAccessibilityDeclaration,
} from '@/lib/services/accessibility.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'data:read');
    const declaration = await getAccessibilityDeclarationById(params.id);
    return apiSuccess(declaration);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'data:ingest');
    const body = await request.json();

    const parsed = updateAccessibilityDeclarationSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    if (parsed.data.is_active === false) {
      const resolved = await resolveAccessibilityDeclaration(params.id, parsed.data.resolution_notes, user.id);
      return apiSuccess(resolved);
    }

    const updated = await updateAccessibilityDeclaration(
      params.id,
      {
        newTier: parsed.data.new_tier as any,
        reason: parsed.data.reason,
        estimatedRestoration: parsed.data.estimated_restoration,
        isActive: parsed.data.is_active,
        resolutionNotes: parsed.data.resolution_notes,
      },
      user.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
