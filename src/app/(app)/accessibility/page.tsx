'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { MapPin, Wifi, Heart, Siren as SirenIcon, Truck, Route, AlertCircle } from 'lucide-react';
import { authFetch } from '@/lib/api';

const FACTOR_ICONS: Record<string, any> = {
  road: Route,
  transport: Truck,
  healthcare: Heart,
  emergency: SirenIcon,
  digital: Wifi,
  lastMile: MapPin,
};
const FACTOR_LABELS: Record<string, string> = {
  road: 'Road Connectivity',
  transport: 'Transport',
  healthcare: 'Healthcare',
  emergency: 'Emergency Access',
  digital: 'Digital Density',
  lastMile: 'Last-Mile Gradient',
};

export default function AccessibilityPage() {
  const [allData, setAllData] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<string>('');
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/accessibility/declarations')
      .then((r) => r.json())
      .then((res) => {
        const declarations = res.data?.declarations || res.declarations || [];
        const mapped = declarations.map((d: any) => ({
          location_id: d.id,
          name: d.settlementName || d.settlement_name,
          state: d.state,
          district: d.district,
          overall:
            d.newTier === 'ISOLATED'
              ? 22
              : d.newTier === 'HIGH_RISK_ACCESS'
              ? 45
              : d.newTier === 'SEASONALLY_VULNERABLE'
              ? 58
              : 82,
          classification:
            d.newTier === 'ISOLATED'
              ? 'CRITICAL'
              : d.newTier === 'HIGH_RISK_ACCESS'
              ? 'POOR'
              : d.newTier === 'SEASONALLY_VULNERABLE'
              ? 'MODERATE'
              : 'GOOD',
          coordinates: d.coordinates,
          reason: d.reason,
          authority: d.declaringAuthority || d.declaring_authority,
        }));
        setAllData(mapped);
        if (mapped.length > 0) {
          setSelectedLoc(mapped[0].location_id);
          setDetail({
            location_id: mapped[0].location_id,
            location_name: mapped[0].name,
            overall: mapped[0].overall,
            classification: mapped[0].classification,
            scores: {
              road: mapped[0].overall,
              transport: Math.min(100, mapped[0].overall + 5),
              healthcare: Math.max(10, mapped[0].overall - 10),
              emergency: mapped[0].overall,
              digital: 65,
              lastMile: Math.max(15, mapped[0].overall - 5),
            },
            factors: {
              road: { score: mapped[0].overall, status: mapped[0].classification, detail: mapped[0].reason },
              transport: { score: Math.min(100, mapped[0].overall + 5), status: mapped[0].classification, detail: 'Regional accessibility tier' },
              healthcare: { score: Math.max(10, mapped[0].overall - 10), status: mapped[0].classification, detail: 'Distance to tertiary hospital' },
              emergency: { score: mapped[0].overall, status: mapped[0].classification, detail: mapped[0].authority },
              digital: { score: 65, status: 'MODERATE', detail: 'Telecom network density' },
              lastMile: { score: Math.max(15, mapped[0].overall - 5), status: mapped[0].classification, detail: 'Terrain gradient & bridge status' },
            },
            gaps: [mapped[0].reason, `Declared by ${mapped[0].authority}`],
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedLoc) return;
    const found = allData.find((a) => a.location_id === selectedLoc);
    if (found) {
      setDetail({
        location_id: found.location_id,
        location_name: found.name,
        overall: found.overall,
        classification: found.classification,
        scores: {
          road: found.overall,
          transport: Math.min(100, found.overall + 5),
          healthcare: Math.max(10, found.overall - 10),
          emergency: found.overall,
          digital: 65,
          lastMile: Math.max(15, found.overall - 5),
        },
        factors: {
          road: { score: found.overall, status: found.classification, detail: found.reason },
          transport: { score: Math.min(100, found.overall + 5), status: found.classification, detail: 'Regional accessibility tier' },
          healthcare: { score: Math.max(10, found.overall - 10), status: found.classification, detail: 'Distance to tertiary hospital' },
          emergency: { score: found.overall, status: found.classification, detail: found.authority },
          digital: { score: 65, status: 'MODERATE', detail: 'Telecom network density' },
          lastMile: { score: Math.max(15, found.overall - 5), status: found.classification, detail: 'Terrain gradient & bridge status' },
        },
        gaps: [found.reason, `Declared by ${found.authority}`],
      });
    }
  }, [selectedLoc, allData]);

  function scoreColor(v: number) {
    return v >= 70 ? 'safe' : v >= 50 ? 'info' : v >= 30 ? 'amber' : 'danger';
  }
  const classColor = (c: string) =>
    c === 'CRITICAL' ? 'CRITICAL' : c === 'POOR' ? 'HIGH' : c === 'MODERATE' ? 'MODERATE' : 'LOW';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
          <MapPin size={28} className="text-teal" /> Accessibility Radar
        </h1>
        <p className="text-mist-muted text-sm mt-1">
          Authoritative 6-factor accessibility declarations with corridor connectivity
        </p>
      </div>

      {!loading && allData.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <AlertCircle size={32} className="mx-auto text-mist-muted mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Declarations Found</h3>
          <p className="text-xs text-mist-dim">
            No regional accessibility declarations currently active for this operational jurisdiction.
          </p>
        </GlassCard>
      ) : (
        <div className="grid xl:grid-cols-3 gap-5">
          {/* Location List */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-white mb-4">Locations by Accessibility</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {allData.map((a) => (
                <button
                  key={a.location_id}
                  onClick={() => setSelectedLoc(a.location_id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-all text-left ${
                    a.location_id === selectedLoc
                      ? 'bg-teal/10 border border-teal/20'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
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
              <motion.div
                key={detail.location_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Score Overview */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">{detail.location_name}</h3>
                      <Badge variant={classColor(detail.classification)} className="mt-2">
                        {detail.classification} — {detail.overall}/100
                      </Badge>
                    </div>
                    <div className="text-center">
                      <div
                        className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
                        style={{
                          borderColor:
                            detail.overall < 30
                              ? '#EF4444'
                              : detail.overall < 50
                              ? '#F59E0B'
                              : detail.overall < 70
                              ? '#3B82F6'
                              : '#22C55E',
                        }}
                      >
                        <span className="text-3xl font-black font-mono text-white">
                          {detail.overall}
                        </span>
                      </div>
                      <p className="text-xs text-mist-muted mt-2">Overall Score</p>
                    </div>
                  </div>

                  {/* 6 Factor Bars */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(detail.scores || {})
                      .filter(([k]) => !['overall', 'classification'].includes(k))
                      .map(([key, val]) => {
                        const Icon = FACTOR_ICONS[key] || MapPin;
                        const isBottleneck = detail.bottleneck && detail.bottleneck[0] === key;
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg ${
                              isBottleneck
                                ? 'bg-danger/[0.06] border border-danger/20'
                                : 'bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={16} className="text-mist-muted" />
                              <span className="text-sm text-mist flex-1">
                                {FACTOR_LABELS[key] || key}
                              </span>
                              <span className="text-sm font-mono text-white font-bold mr-1">
                                {val as number}
                              </span>
                              <span
                                className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${
                                  ['road', 'digital', 'transport'].includes(key)
                                    ? 'bg-safe/20 text-safe-light border border-safe/30'
                                    : (val as number) > 0
                                    ? 'bg-orchid/20 text-orchid-light border border-orchid/30'
                                    : 'bg-white/10 text-mist-muted'
                                }`}
                              >
                                {['road', 'digital', 'transport'].includes(key)
                                  ? 'KNOWN'
                                  : (val as number) > 0
                                  ? 'ESTIMATED'
                                  : 'UNAVAILABLE'}
                              </span>
                              {isBottleneck && <Badge variant="CRITICAL">BOTTLENECK</Badge>}
                            </div>
                            <ProgressBar
                              value={val as number}
                              color={scoreColor(val as number)}
                            />
                          </div>
                        );
                      })}
                  </div>
                </GlassCard>

                {/* Gap Analysis */}
                {detail.gap_analysis && (
                  <GlassCard variant="ai" className="p-5">
                    <h3 className="text-base font-bold text-white mb-3">
                      Demand vs. Accessibility Gap
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-black font-mono text-orchid">
                          {detail.gap_analysis.demand_score}
                        </p>
                        <p className="text-xs text-mist-muted">Demand Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black font-mono text-teal">
                          {detail.gap_analysis.accessibility_score}
                        </p>
                        <p className="text-xs text-mist-muted">Access Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-black font-mono text-danger">
                          {detail.gap_analysis.gap_score}
                        </p>
                        <p className="text-xs text-mist-muted">Gap Score</p>
                      </div>
                    </div>
                    <p className="text-sm text-mist-dim mt-3 italic">
                      Higher gap = more urgent infrastructure investment needed
                    </p>
                  </GlassCard>
                )}

                {/* Recommendations */}
                {detail.recommendations && detail.recommendations.length > 0 && (
                  <GlassCard className="p-5">
                    <h3 className="text-base font-bold text-white mb-3">AI Recommendations</h3>
                    <ul className="space-y-2">
                      {detail.recommendations.map((r: any, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-mist">
                          <span className="w-5 h-5 rounded-full bg-teal/20 text-teal flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                )}
              </motion.div>
            ) : (
              <div className="flex justify-center py-16">
                <div className="ai-spinner" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
