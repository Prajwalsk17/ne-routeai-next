import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { driverDocCreateSchema } from '@/lib/validation';
import { listDriverDocuments, addDriverDocument } from '@/lib/services/driver.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'drivers:read');
    const documents = await listDriverDocuments(params.id, user);
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
    const user = await requirePermission(request, 'drivers:manage');
    const body = await request.json();
    const parsed = driverDocCreateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const doc = await addDriverDocument(
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

    return apiSuccess(doc, { message: 'Driver certification document recorded successfully' }, 201);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
