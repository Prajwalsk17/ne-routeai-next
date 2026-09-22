import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, handleApiError } from '@/lib/api/response';
import { requirePermission } from '@/lib/auth/authorization';
import { driverUpdateSchema } from '@/lib/validation';
import { getDriverById, updateDriver, archiveDriver } from '@/lib/services/driver.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'drivers:read');
    const driver = await getDriverById(params.id, user);
    return apiSuccess(driver);
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'drivers:manage');
    const body = await request.json();
    const parsed = driverUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name) updates.name = parsed.data.name;
    if (parsed.data.phone) updates.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.license_number) updates.licenseNumber = parsed.data.license_number;
    if (parsed.data.license_expiry) updates.licenseExpiry = parsed.data.license_expiry;
    if (parsed.data.mountain_experience_years !== undefined) {
      updates.mountainExperienceYears = parsed.data.mountain_experience_years;
    }
    if (parsed.data.duty_status) updates.dutyStatus = parsed.data.duty_status;
    if (parsed.data.current_vehicle_id !== undefined) updates.currentVehicleId = parsed.data.current_vehicle_id;
    if (parsed.data.safety_score !== undefined) updates.safetyScore = parsed.data.safety_score;

    const updated = await updateDriver(params.id, updates, user);
    return apiSuccess(updated, { message: 'Driver profile updated successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'drivers:manage');
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const result = await archiveDriver(params.id, user, reason);
    return apiSuccess(result, { message: 'Driver suspended/archived successfully' });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
