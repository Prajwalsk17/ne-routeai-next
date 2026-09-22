import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { optimizeEmergencyMission } from '@/lib/engines/emergency-engine';
import { createAlert } from '@/lib/services/alert.service';
import type { EmergencyMissionParams } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json()) as EmergencyMissionParams;

    const result = optimizeEmergencyMission({
      mission_type: body.mission_type || 'Medical',
      origin_id: body.origin_id || 'LOC001',
      destination_id: body.destination_id || 'LOC024',
      cargo_type: body.cargo_type || 'Emergency Medicine',
      cargo_weight_kg: Number(body.cargo_weight_kg) || 500,
      required_eta_hours: body.required_eta_hours,
      priority: body.priority || 'CRITICAL',
    });

    // Persist real emergency alert & trigger real notification pipeline
    try {
      const routeName = result.routes?.[0]?.name || `${body.origin_id || 'Origin'} → ${body.destination_id || 'Destination'}`;
      const durationDisplay = result.routes?.[0]?.travelTimeDisplay || `${result.routes?.[0]?.travelTimeHr || 2}h`;
      await createAlert(
        {
          title: `EMERGENCY MISSION DISPATCHED: ${result.recommended_vehicle?.id || 'EMG-01'}`,
          message: `Priority ${body.priority || 'CRITICAL'} mission dispatched along corridor ${routeName}. Cargo: ${body.cargo_type || 'Emergency Supplies'} (${body.cargo_weight_kg || 500}kg). Estimated transit time: ${durationDisplay}.`,
          severity: (body.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH') as any,
          category: 'SOS_EMERGENCY',
          vehicleId: result.recommended_vehicle?.id,
        },
        user
      );
    } catch {
      // Non-blocking alert persistence
    }

    // Register in emergency mission service
    const { saveMission } = await import('@/lib/services/emergency.service');
    saveMission(result);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
