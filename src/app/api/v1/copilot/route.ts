import { NextRequest } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { executeAICompletion, isAIConfigured, getAIRuntimeInventory } from '@/lib/ai/model-factory';
import { listShipments } from '@/lib/services/shipment.service';
import { listVehicles } from '@/lib/services/fleet.service';
import { listRiskEvents } from '@/lib/services/risk.service';
import { executeCopilotReasoning, CopilotAppContext } from '@/lib/engines/copilot-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({}));
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return apiError('Search query is required', 'VALIDATION_ERROR', 400);
    }

    // 1. Gather live operational facts for context grounding
    const [shipmentsResult, fleetResult, riskResult] = await Promise.all([
      listShipments({ limit: 10 }, user).catch(() => ({ shipments: [], total: 0 })),
      listVehicles({ limit: 10 }, user).catch(() => ({ vehicles: [], total: 0 })),
      listRiskEvents({ limit: 5 } as any).catch(() => ({ events: [], total: 0 })),
    ]);

    const activeShipments = shipmentsResult.shipments.filter(
      (s: any) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED'
    );
    const availableVehicles = fleetResult.vehicles.filter((v: any) => v.status === 'AVAILABLE');
    const activeHazards = riskResult.events.filter((e: any) => e.status === 'ACTIVE');

    const appContext: CopilotAppContext = {
      activeRoute: body.appContext?.activeRoute,
      sharedRoute: body.appContext?.sharedRoute,
      activeRisks: body.appContext?.activeRisks,
      activeMission: body.appContext?.activeMission,
      selectedOriginId: body.appContext?.selectedOriginId,
      selectedDestinationId: body.appContext?.selectedDestinationId,
      userRole: user.role,
      currentModule: body.appContext?.currentModule,
    };

    // 2. Execute deterministic domain reasoning engine first (tools, cards, actions, intent)
    const reasoningResult = await executeCopilotReasoning(query, appContext);

    // 3. If generative AI model is configured (Gemini/Anthropic/OpenAI), run augmented LLM reasoning
    if (isAIConfigured()) {
      const groundingContext = {
        userRole: user.role,
        organizationId: user.organizationId,
        operationalFacts: {
          totalShipments: shipmentsResult.total,
          activeShipmentsCount: activeShipments.length,
          totalFleetVehicles: fleetResult.total,
          availableVehiclesCount: availableVehicles.length,
          activeHazardsCount: activeHazards.length,
          activeHazardsSample: activeHazards.map((h: any) => ({
            type: h.type,
            severity: h.severity,
            locationName: h.locationName,
          })),
        },
        toolsExecuted: reasoningResult.toolsExecuted,
        verifiedDomainAnalysis: reasoningResult.response,
      };

      const systemPrompt = `You are AuraNER AI Copilot, an enterprise logistics and emergency accessibility assistant for Northeast India.
Ground your reasoning in these operational facts and domain analysis:
${JSON.stringify(groundingContext, null, 2)}
Rule: Never invent fake vehicles, coordinates, or shipments. Clearly state when operational data is empty.
For high-impact emergency recommendations, always append: "AI-generated recommendation — verify with authorized authorities before real-world deployment."`;

      // Build conversation history if passed
      const messagesPayload = Array.isArray(body.messages)
        ? [
            { role: 'system' as const, content: systemPrompt },
            ...body.messages.slice(-6).map((m: any) => ({
              role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: String(m.text || m.content || ''),
            })),
            { role: 'user' as const, content: query },
          ]
        : [
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: query },
          ];

      const completion = await executeAICompletion(messagesPayload);

      return apiSuccess({
        response: completion.content,
        intent: reasoningResult.intent,
        toolsExecuted: reasoningResult.toolsExecuted,
        actions: reasoningResult.actions,
        cards: reasoningResult.cards,
        confidence: reasoningResult.confidence,
        provenance: {
          provider: completion.provider,
          model: completion.model,
          tokensUsed: completion.usage.totalTokens,
        },
      });
    }

    // 4. Deterministic Response with Tools, Action Cards, and Provenance
    const inventory = getAIRuntimeInventory();

    return apiSuccess({
      response: reasoningResult.response,
      intent: reasoningResult.intent,
      toolsExecuted: reasoningResult.toolsExecuted,
      actions: reasoningResult.actions,
      cards: reasoningResult.cards,
      confidence: reasoningResult.confidence,
      provenance: {
        provider: 'AuraNER Deterministic Grounding v2.4',
        model: 'Mountain Logistics Domain Engine',
        sourceAttribution: reasoningResult.sourceAttribution,
        note: `Set ${inventory.apiKeyEnvVar} to enable live multi-turn neural LLM reasoning.`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
