'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { LOCATIONS } from '@/lib/seed-data';
import type { DemandForecastResult } from '@/lib/types';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Package } from 'lucide-react';
import { authFetch } from '@/lib/api';

const DEMAND_LOCS = ['LOC002', 'LOC006', 'LOC009', 'LOC024', 'LOC016', 'LOC021'];
const SEASONS = [{ v: 'MONSOON', l: '🌧 Monsoon' }, { v: 'PRE_MONSOON', l: '☁ Pre-Monsoon' }, { v: 'SUMMER', l: '☀ Summer' }, { v: 'WINTER', l: '❄ Winter' }];
const CATEGORY_LABELS: Record<string, string> = { medicine: '💊 Medicine', food: '🍚 Food', water: '💧 Water', emergency_kits: '🧰 Emergency Kits', fuel: '⛽ Fuel' };

export default function DemandPage() {
  const [locId, setLocId] = useState('LOC024');
  const [season, setSeason] = useState('MONSOON');
  const [period, setPeriod] = useState(30);
  const [result, setResult] = useState<DemandForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function forecast() {
    setLoading(true);
    const res = await authFetch('/api/demand/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: locId, season, period_days: period }) });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><TrendingUp size={28} className="text-orchid" /> Demand Forecast</h1>
        <p className="text-mist-muted text-sm mt-1">Seasonal demand prediction &amp; pre-positioning</p></div>

      <GlassCard className="p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[180px]"><label className="block text-sm text-mist-dim mb-2">Location</label>
            <select value={locId} onChange={e => setLocId(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none">
              {DEMAND_LOCS.map(id => { const l = LOCATIONS.find(x => x.id === id); return <option key={id} value={id}>{l?.name}, {l?.state}</option>; })}
            </select></div>
          <div className="w-44"><label className="block text-sm text-mist-dim mb-2">Season</label>
            <select value={season} onChange={e => setSeason(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none">
              {SEASONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select></div>
          <div className="w-36"><label className="block text-sm text-mist-dim mb-2">Period (days)</label>
            <input type="number" value={period} onChange={e => setPeriod(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none" /></div>
          <button onClick={forecast} disabled={loading} className="px-6 py-3 rounded-lg bg-gradient-to-r from-orchid to-teal text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50">
            {loading ? '...' : 'Forecast'}
          </button>
        </div>
      </GlassCard>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(result.forecasts).map(([key, val]) => {
              const isUp = val.predicted_change_pct > 0;
              return (
                <GlassCard key={key} className="p-5 text-center">
                  <p className="text-xs text-mist-muted mb-2">{CATEGORY_LABELS[key] || key}</p>
                  <p className={`text-3xl font-black font-mono ${isUp ? 'text-danger' : 'text-safe'}`}>
                    {isUp ? '+' : ''}{val.predicted_change_pct}%
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-mist-muted">
                    {isUp ? <ArrowUp size={12} className="text-danger" /> : <ArrowDown size={12} className="text-safe" />}
                    Base: {val.current}/100
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard variant="ai" className="p-5">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><Package size={18} /> Pre-Positioning Advisory</h3>
            <Badge variant={result.pre_positioning.urgency === 'HIGH' ? 'CRITICAL' : 'MODERATE'} className="mb-3">{result.pre_positioning.urgency} URGENCY</Badge>
            <p className="text-sm text-mist leading-relaxed">{result.pre_positioning.recommendation}</p>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
