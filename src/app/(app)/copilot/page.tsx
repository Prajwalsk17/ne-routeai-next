'use client';
import GlassCard from '@/components/ui/GlassCard';
import { Brain } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function CopilotPage() {
  const { setCopilotOpen } = useStore();
  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><Brain size={28} className="text-orchid" /> AI Copilot</h1>
        <p className="text-mist-muted text-sm mt-1">Natural language logistics assistant</p></div>
      <GlassCard variant="ai" className="p-8 text-center">
        <Brain size={64} className="text-orchid mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-white mb-2">NER-RouteAI Copilot</h2>
        <p className="text-mist-dim text-sm max-w-md mx-auto mb-6">Ask questions about routes, risk, accessibility, fleet status, supply positioning, and more. The copilot retrieves live data from all AI engines.</p>
        <button onClick={() => setCopilotOpen(true)} className="px-8 py-3 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold shadow-lg shadow-orchid/25 hover:-translate-y-0.5 transition-all">Open AI Copilot →</button>
        <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg mx-auto">
          {['Which routes are risky?', 'Accessibility bottlenecks', 'Fleet status', 'Pre-position supplies', 'Emergency deliveries', 'System overview'].map(q => (
            <button key={q} onClick={() => { setCopilotOpen(true); }} className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-mist-dim text-sm hover:bg-orchid/[0.08] hover:text-orchid-light transition-all text-left">&ldquo;{q}&rdquo;</button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
