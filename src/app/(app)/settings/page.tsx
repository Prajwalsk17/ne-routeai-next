'use client';
import GlassCard from '@/components/ui/GlassCard';
import { Settings, Mountain, Database, Shield, Cpu } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><Settings size={28} className="text-mist-dim" /> Settings</h1>
        <p className="text-mist-muted text-sm mt-1">Platform configuration</p></div>
      <div className="max-w-2xl space-y-5">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4"><Mountain className="text-orchid" size={20} /><h3 className="text-base font-bold text-white">Platform</h3></div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-mist-dim">Application</span><span className="text-white font-semibold">NER-RouteAI v1.0.0-prototype</span></div>
            <div className="flex justify-between"><span className="text-mist-dim">Event</span><span className="text-mist">Smart India Hackathon 2024</span></div>
            <div className="flex justify-between"><span className="text-mist-dim">Stack</span><span className="text-mist">Next.js + Tailwind + Framer Motion</span></div>
            <div className="flex justify-between"><span className="text-mist-dim">Theme</span><span className="text-orchid-light">Borders of Nature &amp; Tech</span></div>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4"><Database className="text-safe" size={20} /><h3 className="text-base font-bold text-white">Data Mode</h3></div>
          <div className="p-4 rounded-lg bg-safe/[0.06] border border-safe/20">
            <p className="text-sm text-mist-dim">Production data. Live telemetry feeds and AI predictive models connected across regional transport networks.</p>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4"><Cpu className="text-teal" size={20} /><h3 className="text-base font-bold text-white">AI Engines</h3></div>
          <div className="space-y-2">
            {['Route Optimization Engine', 'Predictive Risk Engine', 'Accessibility Intelligence', 'Emergency Mission Engine', 'Disaster Simulation Engine', 'Demand Forecast Engine', 'AI Copilot (NLP)'].map(e => (
              <div key={e} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <span className="text-sm text-mist">{e}</span>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-safe animate-pulse" /><span className="text-xs text-safe font-semibold">ACTIVE</span></div>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4"><Shield className="text-info" size={20} /><h3 className="text-base font-bold text-white">Coverage</h3></div>
          <p className="text-sm text-mist-dim">8 NE States • 25 Locations • 15 Road Corridors • 10 Warehouses • 20 Hospitals • 25 Vehicles</p>
        </GlassCard>
      </div>
    </div>
  );
}
