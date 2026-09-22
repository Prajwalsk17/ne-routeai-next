import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { vehicleDocCreateSchema } from '@/lib/validation';
import { listVehicleDocuments, addVehicleDocument } from '@/lib/services/fleet.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:read');
    const documents = await listVehicleDocuments(params.id, user);
    return apiSuccess(documents, { count: documents.length });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'fleet:manage');
    const body = await request.json();
    const parsed = vehicleDocCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const doc = await addVehicleDocument(
      params.id,
      {
        documentType: parsed.data.document_type,
        documentNumber: parsed.data.document_number,
        issuedAt: parsed.data.issued_at,
        expiresAt: parsed.data.expires_at,
        storageUrl: parsed.data.storage_url,
        notes: parsed.data.notes,
      },
      user
    );

    return apiSuccess(doc, { message: 'Vehicle document recorded successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
