'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import KPICard from '@/components/ui/KPICard';
import { LOCATIONS } from '@/lib/seed-data';
import type { SimulationResult, ScenarioType } from '@/lib/types';
import { FlaskConical, Zap, AlertTriangle, ArrowRight, Route, Truck, Clock, DollarSign, CheckCircle2 } from 'lucide-react';
import { authFetch } from '@/lib/api';

const SCENARIOS: { type: ScenarioType; label: string; icon: string }[] = [
  { type: 'HEAVY_RAINFALL', label: 'Heavy Rainfall', icon: '🌧' },
  { type: 'LANDSLIDE', label: 'Landslide', icon: '⛰' },
  { type: 'FLOOD', label: 'Flood', icon: '🌊' },
  { type: 'HIGHWAY_CLOSURE', label: 'Highway Closure', icon: '🚧' },
  { type: 'BRIDGE_FAILURE', label: 'Bridge Failure', icon: '🌉' },
  { type: 'FUEL_SHORTAGE', label: 'Fuel Shortage', icon: '⛽' },
];

export default function SimulatorPage() {
  const [scenario, setScenario] = useState<ScenarioType>('LANDSLIDE');
  const [severity, setSeverity] = useState(0.7);
  const [duration, setDuration] = useState(24);
  const [locId, setLocId] = useState('LOC002');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function simulate() {
    setLoading(true);
    const res = await authFetch('/api/v1/simulation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario_type: scenario, severity, duration_hours: duration, location_id: locId }) });
    const json = await res.json();
    setResult(json?.data || json);
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><FlaskConical size={28} className="text-amber" /> Disaster Simulator</h1>
        <p className="text-mist-muted text-sm mt-1">What-if scenario modeling · Deterministic vulnerability calculation engine (Synthetic simulation, not live sensor prediction)</p></div>

      <GlassCard className="p-6 mb-6">
        <div className="grid sm:grid-cols-2 gap-5">
          <div><label className="block text-sm text-mist-dim mb-2">Scenario</label>
            <div className="grid grid-cols-3 gap-2">
              {SCENARIOS.map(s => (
                <button key={s.type} onClick={() => setScenario(s.type)} className={`p-3 rounded-lg text-center text-sm transition-all ${scenario === s.type ? 'bg-amber/15 border border-amber/30 text-amber-light' : 'bg-white/[0.04] border border-white/[0.08] text-mist-dim hover:bg-amber/[0.06]'}`}>
                  <span className="block text-lg">{s.icon}</span>{s.label}
                </button>
              ))}
            </div></div>
          <div className="space-y-4">
            <div><label className="block text-sm text-mist-dim mb-2">Severity: {Math.round(severity * 100)}%</label>
              <input type="range" min="0.1" max="1" step="0.1" value={severity} onChange={e => setSeverity(Number(e.target.value))} className="w-full accent-amber" /></div>
            <div><label className="block text-sm text-mist-dim mb-2">Duration (hours)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-amber/50 focus:outline-none" /></div>
            <div><label className="block text-sm text-mist-dim mb-2">Epicenter</label>
              <select value={locId} onChange={e => setLocId(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-amber/50 focus:outline-none">
                {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select></div>
          </div>
        </div>
        <button onClick={simulate} disabled={loading} className="mt-5 w-full py-3.5 rounded-xl bg-gradient-to-r from-amber to-danger text-white font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50">
          {loading ? <span className="ai-spinner !w-5 !h-5 !border-2" /> : <><Zap size={20} /> Run Simulation</>}
        </button>
      </GlassCard>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Impact KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard title="Routes Affected" value={result.affected_routes} icon={Route} color="danger" />
            <KPICard title="Vehicles Impacted" value={result.vehicles_affected} icon={Truck} color="amber" />
            <KPICard title="Delay (hours)" value={result.estimated_delay_hours} icon={Clock} color="danger" />
            <KPICard title="Cost Multiplier" value={result.logistics_cost_multiplier} suffix="x" icon={DollarSign} color="amber" />
          </div>

          {/* Before / After */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-safe mb-4">Before Scenario</h3>
              {Object.entries(result.before).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm text-mist-dim capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-mono text-white">{v}{typeof v === 'number' && v < 10 ? 'h' : typeof v === 'number' && v > 10 && v <= 100 ? '%' : ''}</span>
                </div>
              ))}
            </GlassCard>
            <GlassCard variant="danger" className="p-5">
              <h3 className="text-base font-bold text-danger mb-4">After Scenario</h3>
              {Object.entries(result.after).map(([k, v]) => {
                const before = result.before[k as keyof typeof result.before] as number;
                const worse = k.includes('risk') || k.includes('time') ? v > before : v < before;
                return (
                  <div key={k} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-sm text-mist-dim capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className={`text-sm font-mono ${worse ? 'text-danger' : 'text-safe'}`}>{v}{typeof v === 'number' && v < 10 ? 'h' : typeof v === 'number' && v > 10 && v <= 100 ? '%' : ''}</span>
                  </div>
                );
              })}
            </GlassCard>
          </div>

          {/* Response Plan */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-white mb-3">AI Response Plan</h3>
            <ol className="space-y-2">
              {result.response_plan.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-mist"><span className="w-5 h-5 rounded-full bg-amber/20 text-amber flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>{step}</li>
              ))}
            </ol>
            <div className="mt-5 flex gap-3">
              <button className="px-4 py-2 rounded-lg bg-safe text-white text-sm font-semibold hover:bg-safe/80 transition-all flex items-center gap-2"><CheckCircle2 size={16} /> Accept Plan</button>
              <button className="px-4 py-2 rounded-lg bg-amber/15 border border-amber/30 text-amber-light text-sm hover:bg-amber/25 transition-all">Modify</button>
              <button className="px-4 py-2 rounded-lg bg-danger/15 border border-danger/30 text-danger-light text-sm hover:bg-danger/25 transition-all">Override</button>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
