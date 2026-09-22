import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/auth/authorization';
import { subscribeToTelemetry } from '@/lib/services/telemetry.service';
import type { GpsPosition } from '@/lib/types/telemetry';
import { handleApiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'telemetry:read');
    const organizationId = user.organizationId;

    if (!organizationId && user.role !== 'SUPER_ADMIN') {
      return new Response('Unauthorized organization context', { status: 403 });
    }

    const targetOrg = organizationId || 'all';
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmation event
        const initData = JSON.stringify({
          type: 'CONNECTED',
          organizationId: targetOrg,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`event: connected\ndata: ${initData}\n\n`));

        // Subscribe to live telemetry positions for this tenant
        const unsubscribe = subscribeToTelemetry(targetOrg, (position: GpsPosition) => {
          try {
            const eventPayload = JSON.stringify(position);
            controller.enqueue(encoder.encode(`event: position\ndata: ${eventPayload}\n\n`));
          } catch (err) {
            console.error('SSE position enqueue failed:', err);
          }
        });

        // 15-second heartbeat ping to prevent proxy/browser disconnects
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(`event: ping\ndata: {"time":"${new Date().toISOString()}"}\n\n`)
            );
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        // Handle client abort / disconnect
        request.signal.addEventListener('abort', () => {
          unsubscribe();
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    return handleApiError(err);
  }
}
