'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { Brain, Sparkles, MessageSquare, Route, ShieldAlert, Siren, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';

const FEATURED_PROMPTS = [
  {
    category: 'Route Intelligence',
    icon: Route,
    color: 'text-safe bg-safe/10 border-safe/20',
    queries: [
      'What is the safest available route from Guwahati to Tawang?',
      'Why did you select this route?',
      'What happens if this road becomes unavailable?',
      'Find an alternative route',
    ],
  },
  {
    category: 'Risk & Geology',
    icon: ShieldAlert,
    color: 'text-amber bg-amber/10 border-amber/20',
    queries: [
      'Which risks are currently affecting my route?',
      'Explain the risk score',
      'Why is this corridor being avoided?',
      'What should we do during a landslide?',
    ],
  },
  {
    category: 'Emergency Response & Last-Mile',
    icon: Siren,
    color: 'text-danger bg-danger/10 border-danger/20',
    queries: [
      'Show me the active emergency missions',
      'How can I deliver essential cargo to an isolated community?',
      'What transport modes can be used here?',
      'Explain multimodal logistics',
    ],
  },
];

export default function CopilotPage() {
  const { setCopilotOpen } = useStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <Brain size={28} className="text-orchid" /> AI Copilot Intelligence Center
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Grounded multimodal reasoning, tactical route optimization, and terrain safety advisory
          </p>
        </div>
        <button
          onClick={() => setCopilotOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold text-xs sm:text-sm shadow-lg shadow-orchid/25 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Sparkles size={16} /> Open Copilot Drawer
        </button>
      </div>

      <GlassCard variant="ai" className="p-8 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-orchid/20 text-orchid flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orchid/20">
            <Brain size={36} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
            Northeast India Logistics Reasoning System
          </h2>
          <p className="text-mist-dim text-sm leading-relaxed mb-6">
            The AI Copilot evaluates live road graph topologies, geological landslide susceptibility indices, real-time weather radar, and emergency mission registries to answer natural language dispatch queries.
          </p>
          <button
            onClick={() => setCopilotOpen(true)}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orchid via-teal to-orchid text-white font-bold text-sm shadow-xl shadow-orchid/30 hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            <span>Launch Conversational Assistant</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </GlassCard>

      <div className="grid md:grid-cols-3 gap-5">
        {FEATURED_PROMPTS.map((col, idx) => (
          <GlassCard key={idx} className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`p-2 rounded-lg border ${col.color}`}>
                <col.icon size={18} />
              </div>
              <h3 className="text-sm font-bold text-white">{col.category}</h3>
            </div>
            <div className="space-y-2">
              {col.queries.map((q) => (
                <button
                  key={q}
                  onClick={() => setCopilotOpen(true)}
                  className="w-full p-3 rounded-xl bg-white/[0.02] hover:bg-orchid/[0.08] border border-white/5 hover:border-orchid/30 text-xs text-mist-dim hover:text-white transition-all text-left flex items-start gap-2 group"
                >
                  <MessageSquare size={13} className="text-orchid flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="leading-relaxed">&ldquo;{q}&rdquo;</span>
                </button>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
