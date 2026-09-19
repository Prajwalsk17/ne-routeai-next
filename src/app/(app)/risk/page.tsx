'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import KPICard from '@/components/ui/KPICard';
import { LOCATIONS } from '@/lib/seed-data';
import type { RiskPrediction, RiskRegion } from '@/lib/types';
import { ShieldAlert, CloudRain, Mountain, Waves, Timer, MapPin } from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function RiskPage() {
  const [regions, setRegions] = useState<RiskRegion[]>([]);
  const [selectedLoc, setSelectedLoc] = useState('LOC009');
  const [horizon, setHorizon] = useState(24);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { authFetch('/api/risk/regions').then(r => r.json()).then(setRegions); }, []);
  useEffect(() => { predict(); }, [selectedLoc, horizon]);

  async function predict() {
    setLoading(true);
    const res = await authFetch('/api/risk/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: selectedLoc, horizon_hours: horizon }) });
    setPrediction(await res.json());
    setLoading(false);
  }

  function riskColor(v: number) { return v >= 70 ? 'danger' : v >= 50 ? 'amber' : v >= 30 ? 'info' : 'safe'; }
  const loc = LOCATIONS.find(l => l.id === selectedLoc);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><ShieldAlert size={28} className="text-amber" /> Predictive Risk Intelligence</h1>
        <p className="text-mist-muted text-sm mt-1">Multi-factor risk scoring with seasonal models</p>
      </div>

      {/* Controls */}
      <GlassCard className="p-5 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm text-mist-dim mb-2">Location</label>
            <select value={selectedLoc} onChange={e => setSelectedLoc(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none">
              {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name}, {l.state}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-sm text-mist-dim mb-2">Prediction Horizon</label>
            <select value={horizon} onChange={e => setHorizon(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none">
              <option value={6}>6 Hours</option><option value={12}>12 Hours</option><option value={24}>24 Hours</option><option value={48}>48 Hours</option><option value={72}>72 Hours</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {loading ? <div className="flex justify-center py-16"><div className="ai-spinner" /></div> : prediction && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard title="Overall Risk" value={prediction.overall_risk} suffix="/100" icon={ShieldAlert} color={prediction.overall_risk >= 60 ? 'danger' : 'amber'} />
            <KPICard title="Landslide Prob." value={prediction.landslide_probability} suffix="%" icon={Mountain} color={prediction.landslide_probability >= 60 ? 'danger' : 'amber'} />
            <KPICard title="Flood Prob." value={prediction.flood_probability} suffix="%" icon={Waves} color={prediction.flood_probability >= 60 ? 'danger' : 'info'} />
            <KPICard title="Road Disruption" value={prediction.road_disruption_probability} suffix="%" icon={MapPin} color={prediction.road_disruption_probability >= 60 ? 'danger' : 'amber'} />
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            {/* Risk Factors Detail */}
            <GlassCard className="p-5 xl:col-span-2">
              <h3 className="text-base font-bold text-white mb-4">Risk Factor Analysis — {loc?.name}</h3>
              <div className="space-y-4">
                {[
                  { name: 'Rainfall Intensity', value: prediction.factors.rainfall, icon: CloudRain },
                  { name: 'Terrain Instability', value: prediction.factors.terrain, icon: Mountain },
                  { name: 'Historical Incidents', value: prediction.factors.historical, icon: Timer },
                  { name: 'Road Condition Risk', value: prediction.factors.roadCondition, icon: MapPin },
                  { name: 'Flood Indicator', value: prediction.factors.floodIndicator, icon: Waves },
                ].map(f => (
                  <div key={f.name} className="flex items-center gap-4">
                    <f.icon size={18} className="text-mist-muted flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-mist">{f.name}</span>
                        <span className="text-sm font-mono text-white">{f.value}/100</span>
                      </div>
                      <ProgressBar value={f.value} color={riskColor(f.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 bg-orchid/[0.05] rounded-lg border-l-[3px] border-orchid text-sm text-mist leading-relaxed">
                <strong>AI Assessment:</strong> {prediction.overall_risk >= 70
                  ? `CRITICAL risk detected for ${loc?.name}. Avoid dispatching non-critical cargo during the ${horizon}h window.`
                  : prediction.overall_risk >= 50
                  ? `Elevated risk for ${loc?.name}. Use high-clearance vehicles and monitor conditions.`
                  : `${loc?.name} corridor is operational with standard precautions.`}
              </div>
            </GlassCard>

            {/* Regional Risk Table */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-white mb-4">Risk Hotspots</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {regions.map(r => (
                  <button key={r.location_id} onClick={() => setSelectedLoc(r.location_id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${r.location_id === selectedLoc ? 'bg-orchid/10 border border-orchid/20' : 'hover:bg-white/[0.03]'}`}>
                    <div>
                      <p className="text-sm text-white font-medium">{r.name}</p>
                      <p className="text-[0.65rem] text-mist-muted">{r.state}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={r.overall_risk} color={riskColor(r.overall_risk)} className="w-16" />
                      <Badge variant={r.status}>{r.overall_risk}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      )}
    </div>
  );
}
