'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { LOCATIONS, CARGO_TYPES } from '@/lib/seed-data';
import type { RouteCandidate, RouteAnalysisResult, RiskLevel } from '@/lib/types';
import { Route, Zap, Shield, Clock, IndianRupee, AlertTriangle, ChevronDown, CheckCircle2, Brain, Truck, Navigation, Radio, X, ArrowRight } from 'lucide-react';
import { authFetch } from '@/lib/api';

type Phase = 'form' | 'analyzing' | 'results';

const ANALYSIS_STEPS = [
  'Loading terrain data...',
  'Computing weather overlay...',
  'Running multi-criteria scoring...',
  'Generating AI explanations...',
  'Ranking candidate routes...',
];

export default function RoutesPage() {
  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState({
    origin_id: 'LOC001',
    destination_id: 'LOC002',
    cargo_type: 'Medical Supplies',
    cargo_weight_kg: 800,
    vehicle_type: 'TRUCK',
    priority: 'HIGH' as const,
  });
  const [result, setResult] = useState<RouteAnalysisResult | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState(0);

  // Dispatch execution state
  const [dispatchingRouteId, setDispatchingRouteId] = useState<string | null>(null);
  const [dispatchedShipment, setDispatchedShipment] = useState<any | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  async function analyze() {
    setPhase('analyzing');
    setStepsDone(0);
    // Animate steps
    for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 450));
      setStepsDone(i + 1);
    }
    try {
      const res = await authFetch('/api/routes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      // Fallback
    }
    await new Promise(r => setTimeout(r, 200));
    setPhase('results');
  }

  async function handleDispatchRoute(route: RouteCandidate) {
    setDispatchingRouteId(route.id);
    setDispatchError(null);
    try {
      // 1. Create real shipment record
      const shipRes = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: form.origin_id,
          destination_id: form.destination_id,
          cargo_type: form.cargo_type,
          cargo_weight_kg: form.cargo_weight_kg,
          cargo_volume_m3: Math.max(1, Math.round(form.cargo_weight_kg / 250)),
          priority: form.priority,
          notes: `Optimized via Smart Route AI (${route.name}, Score ${route.score}/100)`,
        }),
      });
      const shipData = await shipRes.json();
      if (!shipData.success) throw new Error(shipData.error?.message || 'Failed to create shipment');

      const shipment = shipData.data;

      // 2. Dispatch shipment to vehicle & driver
      const dispatchRes = await fetch('/api/v1/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipment.id,
          vehicle_id: 'c0000000-0000-0000-0000-000000000001',
          driver_id: 'Officer Tenzing Norbu',
          route_id: route.id,
        }),
      });
      const dispatchData = await dispatchRes.json();
      if (!dispatchData.success) throw new Error(dispatchData.error?.message || 'Dispatch execution failed');

      // 3. Emit initial GPS telemetry ping so radar immediately picks it up
      const originLoc = LOCATIONS.find(l => l.id === form.origin_id);
      if (originLoc) {
        await fetch('/api/v1/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: 'c0000000-0000-0000-0000-000000000001',
            shipment_id: shipment.id,
            latitude: originLoc.lat,
            longitude: originLoc.lng,
            speed_kmh: 38,
            heading_degrees: 110,
          }),
        }).catch(() => {});
      }

      setDispatchedShipment({
        shipment,
        route,
        originName: LOCATIONS.find(l => l.id === form.origin_id)?.name || form.origin_id,
        destName: LOCATIONS.find(l => l.id === form.destination_id)?.name || form.destination_id,
      });
    } catch (err: any) {
      console.error('Dispatch error:', err);
      setDispatchError(err.message || 'Dispatch execution failed');
    } finally {
      setDispatchingRouteId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <Route size={28} className="text-orchid" /> Smart Route AI
          </h1>
          <p className="text-mist-muted text-sm mt-1">Multi-criteria AI route optimization &amp; real-time dispatch engine</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dispatch"
            className="px-4 py-2 rounded-lg bg-teal/10 hover:bg-teal/20 text-teal border border-teal/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Radio size={14} className="animate-pulse" /> Live Dispatch Radar
          </Link>
          <Link
            href="/driver"
            className="px-4 py-2 rounded-lg bg-orchid/10 hover:bg-orchid/20 text-orchid-light border border-orchid/30 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Navigation size={14} /> Driver HUD
          </Link>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* FORM */}
        {phase === 'form' && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-6">
              <h3 className="text-lg font-bold text-white mb-5">Route Analysis Parameters</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Origin</label>
                  <select
                    value={form.origin_id}
                    onChange={e => setForm(f => ({ ...f, origin_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {LOCATIONS.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Destination</label>
                  <select
                    value={form.destination_id}
                    onChange={e => setForm(f => ({ ...f, destination_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {LOCATIONS.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Cargo Type</label>
                  <select
                    value={form.cargo_type}
                    onChange={e => setForm(f => ({ ...f, cargo_type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {CARGO_TYPES.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={form.cargo_weight_kg}
                    onChange={e => setForm(f => ({ ...f, cargo_weight_kg: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Vehicle Type</label>
                  <select
                    value={form.vehicle_type}
                    onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {['TRUCK', 'VAN', 'HELICOPTER', 'BOAT'].map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={analyze}
                className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold text-base flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orchid/30 transition-all"
              >
                <Zap size={20} /> Analyze Routes with AI
              </button>
            </GlassCard>
          </motion.div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-16">
            <div className="ai-spinner !w-16 !h-16 !border-4" />
            <p className="text-white font-semibold text-lg mt-6">AI Route Analysis in Progress</p>
            <div className="mt-8 space-y-3 w-80">
              {ANALYSIS_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {i < stepsDone ? (
                    <CheckCircle2 size={18} className="text-safe" />
                  ) : i === stepsDone ? (
                    <div className="ai-spinner !w-4 !h-4 !border-2" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                  )}
                  <span className={`text-sm ${i < stepsDone ? 'text-safe' : i === stepsDone ? 'text-orchid' : 'text-mist-muted'}`}>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* RESULTS */}
        {phase === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {dispatchError && (
              <div className="mb-5 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger-light text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {dispatchError}
              </div>
            )}

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{result.routes.length} Routes Generated</h3>
              <button
                onClick={() => {
                  setPhase('form');
                  setResult(null);
                }}
                className="text-sm text-orchid hover:text-orchid-light transition-colors"
              >
                ← New Analysis
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-6">
              {result.routes.map((route, idx) => (
                <GlassCard key={route.id} hover className={`p-6 relative ${idx === 0 ? 'border-safe/30 shadow-teal-glow' : ''}`}>
                  {idx === 0 && (
                    <div className="absolute -top-3 left-5 bg-safe text-white text-xs font-bold px-3 py-1 rounded-full">
                      ✓ RECOMMENDED
                    </div>
                  )}
                  <div
                    className="absolute -top-3 right-5 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: route.color }}
                  >
                    {route.rankLabel}
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white font-mono">{route.score}</span>
                      <span className="text-mist-muted text-sm">/100</span>
                    </div>
                    <p className="text-sm text-mist-dim mt-1 font-semibold">{route.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div>
                      <span className="text-[0.65rem] text-mist-muted uppercase">Distance</span>
                      <p className="text-sm text-white font-semibold">{route.distanceKm} km</p>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-mist-muted uppercase">Time</span>
                      <p className="text-sm text-white font-semibold">{route.travelTimeDisplay}</p>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-mist-muted uppercase">Cost</span>
                      <p className="text-sm text-white font-semibold">₹{route.costInr?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[0.65rem] text-mist-muted uppercase">Risk</span>
                      <Badge variant={route.riskLabel}>{route.riskLabel}</Badge>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-[0.65rem] text-mist-muted uppercase">Reliability</span>
                    <div className="flex items-center gap-2 mt-1">
                      <ProgressBar value={route.reliabilityPct} color={route.reliabilityPct > 70 ? 'safe' : 'amber'} className="flex-1" />
                      <span className="text-xs text-white font-mono">{route.reliabilityPct}%</span>
                    </div>
                  </div>

                  {route.warnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {route.warnings.map((w, i) => (
                        <p key={i} className="text-[0.7rem] text-amber-light bg-amber/[0.08] px-2 py-1 rounded flex items-center gap-1">
                          <AlertTriangle size={12} /> {w}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg bg-orchid/10 border border-orchid/20 text-orchid-light hover:bg-orchid/20 transition-all flex items-center justify-center gap-1 font-medium"
                    >
                      <Brain size={14} /> Explain AI
                    </button>
                    <button
                      onClick={() => handleDispatchRoute(route)}
                      disabled={dispatchingRouteId === route.id}
                      className="flex-1 text-xs px-3 py-2.5 rounded-lg bg-safe hover:bg-safe/80 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-safe/25 transition-all disabled:opacity-50"
                    >
                      {dispatchingRouteId === route.id ? (
                        <>
                          <span className="ai-spinner !w-3.5 !h-3.5 !border-2" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Truck size={14} />
                          <span>Dispatch</span>
                        </>
                      )}
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* Explainability Panel */}
            <AnimatePresence>
              {expandedRoute && (() => {
                const route = result.routes.find(r => r.id === expandedRoute);
                if (!route) return null;
                const b = route.scoreBreakdown;
                const factors = [
                  { name: 'Road Condition', value: b.roadCondition, color: 'teal' },
                  { name: 'Weather Safety', value: b.weatherSafety, color: 'info' },
                  { name: 'Landslide Safety', value: b.landslideSafety, color: 'amber' },
                  { name: 'Flood Safety', value: b.floodSafety, color: 'info' },
                  { name: 'Travel Time', value: b.travelTimeScore, color: 'orchid' },
                  { name: 'Cost Efficiency', value: b.costEfficiency, color: 'safe' },
                  { name: 'Accessibility', value: b.accessibility, color: 'teal' },
                ];
                return (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <GlassCard variant="ai" className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain size={20} className="text-orchid" />
                        <h3 className="text-lg font-bold text-white">AI Explainability — {route.name}</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        {factors.map(f => (
                          <div key={f.name}>
                            <span className="text-xs text-mist-muted">{f.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <ProgressBar value={f.value} color={f.color as any} className="flex-1" />
                              <span className="text-sm font-mono text-white">{f.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 bg-orchid/[0.05] rounded-lg border-l-[3px] border-orchid text-sm text-mist leading-relaxed">
                        {route.explanation}
                      </div>
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-safe/10 border border-safe/20 rounded-lg text-safe text-sm font-semibold">
                        <Shield size={16} /> Reliability: {route.reliabilityPct}%
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DISPATCH CONFIRMED MODAL */}
      <AnimatePresence>
        {dispatchedShipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg glass-heavy rounded-3xl p-6 md:p-8 border border-safe/30 shadow-2xl relative"
            >
              <button
                onClick={() => setDispatchedShipment(null)}
                className="absolute top-5 right-5 text-mist-muted hover:text-white p-1 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-safe/20 border border-safe/40 flex items-center justify-center text-safe">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <span className="text-xs font-bold text-safe uppercase tracking-wider">Dispatch Executed</span>
                  <h3 className="text-xl font-black text-white">Live Shipment Dispatched</h3>
                </div>
              </div>

              <p className="text-sm text-mist-dim mb-6">
                Corridor transit instructions and turn-by-turn guidance have been broadcast to vehicle telemetry and the driver navigation terminal.
              </p>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mist-muted">Tracking Code:</span>
                  <span className="font-mono font-bold text-safe">{dispatchedShipment.shipment.shipmentCode}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mist-muted">Corridor:</span>
                  <span className="font-semibold text-white">
                    {dispatchedShipment.originName} ➔ {dispatchedShipment.destName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mist-muted">Selected Route:</span>
                  <span className="text-orchid-light font-medium">{dispatchedShipment.route.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mist-muted">Distance / ETA:</span>
                  <span className="text-mist">
                    {dispatchedShipment.route.distanceKm} km ({dispatchedShipment.route.travelTimeDisplay})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-mist-muted">Assigned Driver:</span>
                  <span className="text-teal font-medium">Officer Tenzing Norbu (AS-01-AX-1010)</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
                  <span className="text-mist-muted">Status:</span>
                  <Badge variant="safe">DISPATCHED (LIVE TELEMETRY)</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/driver?shipmentId=${dispatchedShipment.shipment.id}&simulate=true`}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orchid/30 transition-all"
                >
                  <Navigation size={18} /> Launch Driver Navigation HUD &amp; GPS Simulator
                </Link>

                <Link
                  href="/dispatch"
                  className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-mist hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Radio size={14} className="text-safe" /> View Live Dispatch Radar Map
                </Link>

                <button
                  onClick={() => setDispatchedShipment(null)}
                  className="w-full text-center text-xs text-mist-muted hover:text-white pt-2 transition-colors"
                >
                  Close &amp; Plan Another Route
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
