// ============================================
// NER-RouteAI — AI Copilot Engine
// Intent-matching assistant with live data retrieval
// ============================================

import type { CopilotResponse } from '../types';
import { LOCATIONS, RISK_DATA, ACCESSIBILITY_DATA, VEHICLES, WAREHOUSES, DELIVERIES, ALERTS } from '../seed-data';

type Intent = 'risk' | 'accessibility' | 'route_explain' | 'preposition' | 'fleet' | 'warehouse' | 'emergency' | 'weather' | 'highway' | 'overview' | 'unknown';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (q.match(/risk|risky|danger|hazard|landslide|flood/)) return 'risk';
  if (q.match(/access|poor|remote|gap|bottleneck|reach/)) return 'accessibility';
  if (q.match(/route.*why|why.*route|explain|selected|recommend/)) return 'route_explain';
  if (q.match(/pre.?position|supplies|stock|inventory|move.*hub/)) return 'preposition';
  if (q.match(/fleet|vehicle|truck|driver|fuel/)) return 'fleet';
  if (q.match(/warehouse|hub|storage|capacity/)) return 'warehouse';
  if (q.match(/emergency|mission|urgent|critical.*deliver/)) return 'emergency';
  if (q.match(/weather|rain|storm|monsoon/)) return 'weather';
  if (q.match(/highway|road|blocked|closed|closure/)) return 'highway';
  if (q.match(/overview|summary|status|dashboard/)) return 'overview';
  return 'unknown';
}

export function processCopilotQuery(query: string): CopilotResponse {
  const intent = detectIntent(query);

  switch (intent) {
    case 'risk': {
      const risky = Object.entries(RISK_DATA)
        .filter(([, r]) => r.overall > 55)
        .map(([id, r]) => ({ name: LOCATIONS.find(l => l.id === id)?.name || id, risk: r.overall, status: r.status }))
        .sort((a, b) => b.risk - a.risk);
      return {
        response: `📊 **${risky.length} locations** with elevated risk:\n\n${risky.map(r => `• **${r.name}**: ${r.risk}/100 (${r.status})`).join('\n')}\n\nHighest risk corridor: ${risky[0]?.name}.`,
        actions: [{ label: 'View Risk Intelligence', action: 'navigate', target: 'risk' }],
      };
    }
    case 'accessibility': {
      const poor = Object.entries(ACCESSIBILITY_DATA)
        .filter(([, a]) => a.overall < 50)
        .map(([id, a]) => ({ name: LOCATIONS.find(l => l.id === id)?.name || id, score: a.overall, cls: a.classification }))
        .sort((a, b) => a.score - b.score);
      return {
        response: `🗺️ **${poor.length} locations** with poor/critical accessibility:\n\n${poor.map(p => `• **${p.name}**: ${p.score}/100 (${p.cls})`).join('\n')}\n\nPrimary bottlenecks: last-mile connectivity and healthcare access.`,
        actions: [{ label: 'View Accessibility', action: 'navigate', target: 'accessibility' }],
      };
    }
    case 'route_explain':
      return {
        response: `🧠 **Route Selection Logic:**\n\nRoute A was selected because it provides the best balance of safety, travel time, and accessibility while minimizing disaster risk.\n\nThe weighted scoring model adjusts priorities based on cargo type:\n• **Critical cargo**: Safety 35%, Time 30%, Disaster 20%\n• **Normal cargo**: Time 30%, Cost 25%, Road 20%\n\nEach route is scored across 6 factors with natural language explanation.`,
        actions: [{ label: 'Open Route AI', action: 'navigate', target: 'routes' }],
      };
    case 'preposition': {
      const critical = Object.entries(ACCESSIBILITY_DATA)
        .filter(([, a]) => a.overall < 45)
        .map(([id]) => LOCATIONS.find(l => l.id === id)?.name)
        .filter(Boolean);
      return {
        response: `📦 **Pre-positioning Recommendation:**\n\nBased on demand forecasts and accessibility:\n• Move emergency medicine to **Hub Bravo (Imphal)**\n• Move water supplies to **Hub Foxtrot (Aizawl)**\n• Pre-stage emergency kits near **${critical.join(', ')}**\n\nThese areas show high predicted demand with declining accessibility.`,
        actions: [{ label: 'View Demand Forecast', action: 'navigate', target: 'demand' }],
      };
    }
    case 'fleet': {
      const available = VEHICLES.filter(v => v.status === 'AVAILABLE').length;
      const transit = VEHICLES.filter(v => v.status === 'IN_TRANSIT').length;
      const standby = VEHICLES.filter(v => v.status === 'STANDBY').length;
      return {
        response: `🚛 **Fleet Status:**\n\n• **Available**: ${available} vehicles\n• **In Transit**: ${transit} vehicles\n• **Standby**: ${standby} vehicles\n• **Total**: ${VEHICLES.length} vehicles\n\nAvg fuel: ${Math.round(VEHICLES.reduce((s, v) => s + v.fuelPct, 0) / VEHICLES.length)}%`,
        actions: [{ label: 'View Fleet', action: 'navigate', target: 'fleet' }],
      };
    }
    case 'warehouse': {
      const lowInv = WAREHOUSES.filter(w => w.inventoryLevel === 'LOW');
      return {
        response: `🏭 **Warehouse Status:**\n\n${WAREHOUSES.map(w => `• **${w.name}**: ${w.currentLoadPct}% capacity (${w.inventoryLevel})`).join('\n')}\n\n⚠️ ${lowInv.length} hub(s) with LOW inventory: ${lowInv.map(w => w.name).join(', ')}`,
        actions: [{ label: 'View Warehouses', action: 'navigate', target: 'warehouses' }],
      };
    }
    case 'emergency': {
      const critical = DELIVERIES.filter(d => d.priority === 'CRITICAL');
      return {
        response: `🚨 **Emergency Deliveries:**\n\n${critical.map(d => `• **${d.id}**: ${d.cargoType} → ${LOCATIONS.find(l => l.id === d.destinationId)?.name} (${d.status})`).join('\n') || 'No critical deliveries pending.'}\n\nUse Emergency Logistics to create and dispatch new missions.`,
        actions: [{ label: 'Emergency Logistics', action: 'navigate', target: 'emergency' }],
      };
    }
    case 'weather':
      return {
        response: `🌧️ **Weather-Related Alerts:**\n\n${ALERTS.filter(a => a.type === 'WEATHER' || a.type === 'FLOOD').map(a => `• **${a.severity}**: ${a.title} — ${a.location}`).join('\n') || 'No active weather alerts.'}\n\nMonitor Risk Intelligence for corridor-specific predictions.`,
        actions: [{ label: 'View Risk Intelligence', action: 'navigate', target: 'risk' }],
      };
    case 'highway':
      return {
        response: `🛣️ **Highway Status:**\n\n${ALERTS.filter(a => a.type === 'LANDSLIDE' || a.type === 'INFRASTRUCTURE').map(a => `• **${a.severity}**: ${a.title} — ${a.message}`).join('\n') || 'All monitored highways operational.'}\n\nUse Disaster Simulator for what-if closure analysis.`,
        actions: [{ label: 'Disaster Simulator', action: 'navigate', target: 'simulator' }],
      };
    case 'overview':
      return {
        response: `📊 **NER-RouteAI System Overview:**\n\n• **Active Deliveries**: ${DELIVERIES.length}\n• **Fleet**: ${VEHICLES.length} vehicles\n• **Warehouses**: ${WAREHOUSES.length} hubs\n• **Active Alerts**: ${ALERTS.filter(a => a.active).length}\n• **High-Risk Locations**: ${Object.values(RISK_DATA).filter(r => r.overall > 60).length}\n\nAll systems operational.`,
        actions: [{ label: 'Command Center', action: 'navigate', target: 'dashboard' }],
      };
    default:
      return {
        response: `I can help with logistics queries about Northeast India. Try asking:\n\n• "Which routes are currently risky?"\n• "Show accessibility bottlenecks"\n• "Why was Route A recommended?"\n• "Where should we pre-position supplies?"\n• "Fleet status"\n• "Emergency deliveries"`,
        actions: [],
      };
  }
}
