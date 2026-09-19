'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { LOCATIONS, CARGO_TYPES, MISSION_TYPES } from '@/lib/seed-data';
import type { EmergencyResult } from '@/lib/types';
import { Siren, Zap, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function EmergencyPage() {
  const [form, setForm] = useState({ mission_type: 'Medical', origin_id: 'LOC001', destination_id: 'LOC024', cargo_type: 'Emergency Medicine', cargo_weight_kg: 500, priority: 'CRITICAL' as const });
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function dispatch() {
    setLoading(true);
    const res = await authFetch('/api/emergency/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><Siren size={28} className="text-danger" /> Emergency Logistics</h1>
        <p className="text-mist-muted text-sm mt-1">Priority-scored missions with vehicle selection</p>
      </div>

      <div className="p-4 rounded-xl bg-danger/[0.06] border border-danger/20 flex items-center gap-3 mb-6">
        <span className="w-3 h-3 rounded-full bg-danger animate-pulse" />
        <span className="text-sm text-danger-light font-semibold">Emergency Mode Active — Priority routing engaged</span>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        {/* Form */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-bold text-white mb-5">Mission Parameters</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-mist-dim mb-2">Mission Type</label>
                <select value={form.mission_type} onChange={e => setForm(f => ({ ...f, mission_type: e.target.value }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none">
                  {MISSION_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className="block text-sm text-mist-dim mb-2">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none">
                  {['CRITICAL', 'HIGH', 'MEDIUM'].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-mist-dim mb-2">Origin</label>
                <select value={form.origin_id} onChange={e => setForm(f => ({ ...f, origin_id: e.target.value }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none">
                  {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
              <div><label className="block text-sm text-mist-dim mb-2">Destination</label>
                <select value={form.destination_id} onChange={e => setForm(f => ({ ...f, destination_id: e.target.value }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none">
                  {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-mist-dim mb-2">Cargo</label>
                <select value={form.cargo_type} onChange={e => setForm(f => ({ ...f, cargo_type: e.target.value }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none">
                  {CARGO_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-sm text-mist-dim mb-2">Weight (kg)</label>
                <input type="number" value={form.cargo_weight_kg} onChange={e => setForm(f => ({ ...f, cargo_weight_kg: Number(e.target.value) }))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none" /></div>
            </div>
            <button onClick={dispatch} disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-danger to-amber text-white font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-danger/30 transition-all disabled:opacity-50">
              {loading ? <span className="ai-spinner !w-5 !h-5 !border-2" /> : <><Zap size={20} /> Optimize &amp; Dispatch</>}
            </button>
          </div>
        </GlassCard>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              {/* Priority Score */}
              <GlassCard variant="danger" className="p-6 text-center">
                <p className="text-mist-muted text-sm mb-2">Mission Priority Score</p>
                <div className="text-6xl font-black font-mono text-danger">{result.mission_priority_score}</div>
                <Badge variant={result.priority_level as any} className="mt-3">{result.priority_level}</Badge>
              </GlassCard>

              {/* Recommended Vehicle */}
              {result.recommended_vehicle && (
                <GlassCard className="p-5">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><Truck size={18} /> Recommended Vehicle</h3>
                  <div className="p-4 rounded-lg bg-safe/[0.06] border border-safe/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold font-mono text-white">{result.recommended_vehicle.id}</span>
                        <p className="text-sm text-mist-dim">{result.recommended_vehicle.type} • {result.recommended_vehicle.capacityTons}T • {result.recommended_vehicle.driver}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-safe font-semibold">{result.recommended_vehicle.fuelPct}% fuel</p>
                        <Badge variant="LOW">{result.recommended_vehicle.status}</Badge>
                      </div>
                    </div>
                  </div>
                  {result.suitable_vehicles.length > 1 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-mist-muted">Alternatives:</p>
                      {result.suitable_vehicles.slice(1, 3).map(v => (
                        <div key={v.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] text-sm">
                          <span className="text-mist font-mono">{v.id}</span>
                          <span className="text-mist-muted">{v.type} • {v.fuelPct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}

              {/* Action Plan */}
              <GlassCard className="p-5">
                <h3 className="text-base font-bold text-white mb-3">Action Plan</h3>
                <ol className="space-y-2">
                  {result.action_plan.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-mist">
                      <span className="w-5 h-5 rounded-full bg-danger/20 text-danger flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 rounded-lg bg-safe text-white text-sm font-semibold hover:bg-safe/80 transition-all flex items-center gap-2"><CheckCircle2 size={16} /> Accept &amp; Deploy</button>
                  <button className="px-4 py-2 rounded-lg bg-amber/15 border border-amber/30 text-amber-light text-sm hover:bg-amber/25 transition-all">Review Plan</button>
                  <button className="px-4 py-2 rounded-lg bg-danger/15 border border-danger/30 text-danger-light text-sm hover:bg-danger/25 transition-all">Override</button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
