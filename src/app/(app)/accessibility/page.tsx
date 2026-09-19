'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { LOCATIONS } from '@/lib/seed-data';
import type { AccessibilityResult } from '@/lib/types';
import { MapPin, Wifi, Heart, Siren as SirenIcon, Truck, Route } from 'lucide-react';
import { authFetch } from '@/lib/api';

const FACTOR_ICONS: Record<string, any> = { road: Route, transport: Truck, healthcare: Heart, emergency: SirenIcon, digital: Wifi, lastMile: MapPin };
const FACTOR_LABELS: Record<string, string> = { road: 'Road Connectivity', transport: 'Transport', healthcare: 'Healthcare', emergency: 'Emergency Access', digital: 'Digital', lastMile: 'Last-Mile' };

export default function AccessibilityPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState('LOC024');
  const [detail, setDetail] = useState<AccessibilityResult | null>(null);

  useEffect(() => { authFetch('/api/accessibility').then(r => r.json()).then(setAllData); }, []);
  useEffect(() => { fetchDetail(); }, [selectedLoc]);

  async function fetchDetail() {
    const res = await authFetch(`/api/accessibility/${selectedLoc}`);
    if (res.ok) setDetail(await res.json());
  }

  function scoreColor(v: number) { return v >= 70 ? 'safe' : v >= 50 ? 'info' : v >= 30 ? 'amber' : 'danger'; }
  const classColor = (c: string) => c === 'CRITICAL' ? 'CRITICAL' : c === 'POOR' ? 'HIGH' : c === 'MODERATE' ? 'MODERATE' : 'LOW';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><MapPin size={28} className="text-teal" /> Accessibility Intelligence</h1>
        <p className="text-mist-muted text-sm mt-1">6-factor accessibility scoring with gap analysis</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        {/* Location List */}
        <GlassCard className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Locations by Accessibility</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {allData.map(a => (
              <button key={a.location_id} onClick={() => setSelectedLoc(a.location_id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${a.location_id === selectedLoc ? 'bg-teal/10 border border-teal/20' : 'hover:bg-white/[0.03]'}`}>
                <div>
                  <p className="text-sm text-white font-medium">{a.name}</p>
                  <p className="text-[0.65rem] text-mist-muted">{a.state}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-white">{a.overall}</span>
                  <Badge variant={classColor(a.classification)}>{a.classification}</Badge>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Detail Panel */}
        <div className="xl:col-span-2 space-y-5">
          {detail ? (
            <motion.div key={detail.location_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Score Overview */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">{detail.location_name}</h3>
                    <Badge variant={classColor(detail.classification)} className="mt-2">{detail.classification} — {detail.overall}/100</Badge>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center" style={{ borderColor: detail.overall < 30 ? '#EF4444' : detail.overall < 50 ? '#F59E0B' : detail.overall < 70 ? '#3B82F6' : '#22C55E' }}>
                      <span className="text-3xl font-black font-mono text-white">{detail.overall}</span>
                    </div>
                    <p className="text-xs text-mist-muted mt-2">Overall Score</p>
                  </div>
                </div>

                {/* 6 Factor Bars */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(detail.scores).filter(([k]) => !['overall', 'classification'].includes(k)).map(([key, val]) => {
                    const Icon = FACTOR_ICONS[key] || MapPin;
                    const isBottleneck = detail.bottleneck && detail.bottleneck[0] === key;
                    return (
                      <div key={key} className={`p-3 rounded-lg ${isBottleneck ? 'bg-danger/[0.06] border border-danger/20' : 'bg-white/[0.02]'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={16} className="text-mist-muted" />
                          <span className="text-sm text-mist flex-1">{FACTOR_LABELS[key] || key}</span>
                          <span className="text-sm font-mono text-white font-bold">{val as number}</span>
                          {isBottleneck && <Badge variant="CRITICAL">BOTTLENECK</Badge>}
                        </div>
                        <ProgressBar value={val as number} color={scoreColor(val as number)} />
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              {/* Gap Analysis */}
              {detail.gap_analysis && (
                <GlassCard variant="ai" className="p-5">
                  <h3 className="text-base font-bold text-white mb-3">Demand vs. Accessibility Gap</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-2xl font-black font-mono text-orchid">{detail.gap_analysis.demand_score}</p><p className="text-xs text-mist-muted">Demand Score</p></div>
                    <div><p className="text-2xl font-black font-mono text-teal">{detail.gap_analysis.accessibility_score}</p><p className="text-xs text-mist-muted">Access Score</p></div>
                    <div><p className="text-2xl font-black font-mono text-danger">{detail.gap_analysis.gap_score}</p><p className="text-xs text-mist-muted">Gap Score</p></div>
                  </div>
                  <p className="text-sm text-mist-dim mt-3 italic">Higher gap = more urgent infrastructure investment needed</p>
                </GlassCard>
              )}

              {/* Recommendations */}
              {detail.recommendations && detail.recommendations.length > 0 && (
                <GlassCard className="p-5">
                  <h3 className="text-base font-bold text-white mb-3">AI Recommendations</h3>
                  <ul className="space-y-2">
                    {detail.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-mist">
                        <span className="w-5 h-5 rounded-full bg-teal/20 text-teal flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </motion.div>
          ) : <div className="flex justify-center py-16"><div className="ai-spinner" /></div>}
        </div>
      </div>
    </div>
  );
}
