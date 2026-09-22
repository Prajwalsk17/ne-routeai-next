'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import dynamic from 'next/dynamic';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] bg-[#0F1714] rounded-xl flex flex-col items-center justify-center border border-white/5 gap-2">
      <div className="ai-spinner" />
      <span className="text-xs text-mist-dim font-medium">Initializing Highway Vector Map...</span>
    </div>
  ),
});
import ErrorState from '@/components/ui/ErrorState';
import { LOCATIONS, CARGO_TYPES } from '@/lib/seed-data';
import type { RouteCandidate, RouteAnalysisResult } from '@/lib/types';
import {
  Route,
  Zap,
  Clock,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Brain,
  Truck,
  Navigation,
  Radio,
  X,
  ArrowRight,
  Bookmark,
  Layers,
  MapPin,
  Compass,
  Mountain,
  Gauge,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useStore } from '@/lib/store';

type Phase = 'form' | 'analyzing' | 'results';

const ANALYSIS_STEPS = [
  'Resolving Origin & Destination coordinates...',
  'Connecting to OSRM Road Graph Engine...',
  'Extracting highway corridor segments & terrain topology...',
  'Sampling weather & meteorological overlay...',
  'Verifying route provenance & integrity...',
];

export default function RoutesPage() {
  const { setActiveRoute, setSharedRoute } = useStore();
  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState({
    origin_id: 'LOC001',
    destination_id: 'LOC002',
    cargo_type: 'Medical Supplies',
    cargo_weight_kg: 800,
    vehicle_type: 'TRUCK',
    transport_mode: 'ROAD',
    urgency: 'HIGH',
    risk_tolerance: 'MEDIUM',
    priority: 'HIGH' as const,
  });

  const [result, setResult] = useState<RouteAnalysisResult | null>(null);
  const [planData, setPlanData] = useState<any | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dispatch execution state
  const [dispatchingRouteId, setDispatchingRouteId] = useState<string | null>(null);
  const [dispatchedShipment, setDispatchedShipment] = useState<any | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Save corridor state
  const [savingCorridor, setSavingCorridor] = useState(false);
  const [corridorSaved, setCorridorSaved] = useState(false);

  async function analyze() {
    // 1. Client-Side Validation (Section 2)
    if (!form.origin_id || !form.destination_id) {
      setErrorMsg('Please select both a valid origin and destination location.');
      setPhase('results');
      return;
    }

    if (form.origin_id.trim().toLowerCase() === form.destination_id.trim().toLowerCase()) {
      setErrorMsg('Origin and destination cannot be the same location. Please select distinct locations.');
      setPhase('results');
      return;
    }

    setPhase('analyzing');
    setStepsDone(1);
    setErrorMsg(null);
    setCorridorSaved(false);

    try {
      setStepsDone(2);
      const originObj = LOCATIONS.find((l) => l.id === form.origin_id);
      const destObj = LOCATIONS.find((l) => l.id === form.destination_id);

      // 2. Call real route calculation provider with verified credentials
      const planRes = await authFetch('/api/v1/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: form.origin_id,
          destination_id: form.destination_id,
          origin_coords: originObj ? { lat: originObj.lat, lng: originObj.lng } : undefined,
          destination_coords: destObj ? { lat: destObj.lat, lng: destObj.lng } : undefined,
          vehicle_id: form.vehicle_type,
          transport_mode: form.transport_mode,
          cargo_type: form.cargo_type,
          cargo_weight_kg: form.cargo_weight_kg,
          urgency: form.urgency,
          risk_tolerance: form.risk_tolerance,
          priority: form.priority,
        }),
      });

      setStepsDone(3);
      const planJson = await planRes.json();
      if (!planRes.ok || !planJson.success) {
        throw new Error(planJson.error?.message || 'No route could be calculated between these locations.');
      }

      setPlanData(planJson.data);
      setStepsDone(4);

      // 3. Fetch multi-criteria comparative analysis
      let routeData: RouteAnalysisResult | null = null;
      try {
        const res = await authFetch('/api/v1/routes/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          const data = await res.json();
          routeData = data?.data || data;
          setResult(routeData);
          setActiveRoute(routeData);
        }
      } catch {
        // Multi-criteria analysis fallback
      }

      // 4. Synchronize with Shared Route Architecture (Section 19)
      const originName = originObj?.name || planJson.data.origin?.name || form.origin_id;
      const destName = destObj?.name || planJson.data.destination?.name || form.destination_id;
      const durationMin = planJson.data.durationMinutes || 0;
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      const formattedEta = `${hours}h ${mins}m`;

      setSharedRoute({
        routeId: planJson.data.routeId,
        originId: form.origin_id,
        originName,
        originCoords: originObj ? { lat: originObj.lat, lng: originObj.lng } : planJson.data.origin?.coordinates,
        destinationId: form.destination_id,
        destinationName: destName,
        destinationCoords: destObj ? { lat: destObj.lat, lng: destObj.lng } : planJson.data.destination?.coordinates,
        distanceKm: planJson.data.distanceKm,
        durationMinutes: durationMin,
        formattedEta,
        transportMode: form.transport_mode,
        cargoType: form.cargo_type,
        cargoWeightKg: form.cargo_weight_kg,
        priority: form.priority,
        coordinates: planJson.data.coordinates || [],
        segments: planJson.data.segments || [],
        elevationGainMeters: planJson.data.elevationGainMeters,
        maxGradientPct: planJson.data.maxGradientPct,
        provider: planJson.data.provider || 'OSRM Road Graph Engine',
        cacheStatus: planJson.data.provenance?.cacheStatus || 'LIVE',
        calculatedAt: new Date().toISOString(),
        riskAssessment: {
          compositeScore: planJson.data.riskAssessment?.compositeScore ?? 25,
          severityLevel: planJson.data.riskAssessment?.riskLevel || 'LOW',
          factors: planJson.data.riskAssessment?.factors || [],
        },
        alternatives: planJson.data.alternatives || [],
      });

      setStepsDone(5);
      setPhase('results');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No route could be calculated between these locations.');
      setPhase('results');
    }
  }

  async function handleSaveCorridor() {
    if (!planData) return;
    setSavingCorridor(true);
    try {
      const originLoc = LOCATIONS.find((l) => l.id === form.origin_id);
      const destLoc = LOCATIONS.find((l) => l.id === form.destination_id);

      const res = await authFetch('/api/v1/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${originLoc?.name || form.origin_id} to ${destLoc?.name || form.destination_id} Corridor`,
          origin_location_id: form.origin_id,
          destination_location_id: form.destination_id,
          corridor_highway_code: planData.segments?.[0]?.highwayCode || 'NH-27',
          is_template: true,
          origin_coords: planData.origin?.coordinates || { lat: originLoc?.lat || 26.14, lng: originLoc?.lng || 91.73 },
          destination_coords: planData.destination?.coordinates || { lat: destLoc?.lat || 26.63, lng: destLoc?.lng || 92.80 },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save route corridor');
      }

      setCorridorSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving route corridor');
    } finally {
      setSavingCorridor(false);
    }
  }

  async function handleDispatchRoute(route: RouteCandidate) {
    setDispatchingRouteId(route.id);
    setDispatchError(null);
    try {
      const shipRes = await authFetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_facility_id: form.origin_id,
          destination_facility_id: form.destination_id,
          cargo_classification: 'GENERAL_FREIGHT',
          priority: form.priority,
          total_weight_kg: form.cargo_weight_kg,
          total_volume_m3: Math.max(1, Math.round(form.cargo_weight_kg / 250)),
          notes: `Optimized via Smart Route AI (${route.name}, Score ${route.score}/100)`,
        }),
      });
      const shipData = await shipRes.json();
      if (!shipData.success) throw new Error(shipData.error?.message || 'Failed to create shipment');

      const shipment = shipData.data;

      setDispatchedShipment({
        shipment,
        route,
        originName: LOCATIONS.find((l) => l.id === form.origin_id)?.name || form.origin_id,
        destName: LOCATIONS.find((l) => l.id === form.destination_id)?.name || form.destination_id,
      });
    } catch (err: unknown) {
      setDispatchError(err instanceof Error ? err.message : 'Dispatch execution failed');
    } finally {
      setDispatchingRouteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <Route size={28} className="text-orchid" /> Smart Route AI &amp; Map Engine
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Real provider road network routing, terrain gradients, and multi-segment tracking across Northeast India.
          </p>
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
              <h3 className="text-lg font-bold text-white mb-5">Route Parameters &amp; Corridor Query</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Origin Facility / Node</label>
                  <select
                    value={form.origin_id}
                    onChange={(e) => setForm((f) => ({ ...f, origin_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Destination Facility / Node</label>
                  <select
                    value={form.destination_id}
                    onChange={(e) => setForm((f) => ({ ...f, destination_id: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {LOCATIONS.map((l) => (
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
                    onChange={(e) => setForm((f) => ({ ...f, cargo_type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {CARGO_TYPES.map((c) => (
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
                    onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Vehicle Category</label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {['HEAVY_TRUCK', 'MEDIUM_TRUCK', 'UTILITY_4X4', 'LIGHT_VAN'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Transport Mode</label>
                  <select
                    value={form.transport_mode}
                    onChange={(e) => setForm((f) => ({ ...f, transport_mode: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    <option value="ROAD">Road Surface Convoy</option>
                    <option value="AIR_HELICOPTER">Air Logistics / Helicopter Sortie</option>
                    <option value="INLAND_WATERWAY">Inland Waterway (Brahmaputra NW-2)</option>
                    <option value="MULTIMODAL">Multimodal (Road + Rail + Water)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Urgency Level</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    <option value="NORMAL">Standard Transit Window</option>
                    <option value="EXPEDITED">Expedited Transit</option>
                    <option value="EMERGENCY">Emergency Priority Convoy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Risk Tolerance</label>
                  <select
                    value={form.risk_tolerance}
                    onChange={(e) => setForm((f) => ({ ...f, risk_tolerance: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    <option value="LOW">LOW (Conservative — detour around any hazard)</option>
                    <option value="MEDIUM">MEDIUM (Standard mountain protocol)</option>
                    <option value="HIGH">HIGH (Tactical transit with heavy escort)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-mist-dim mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-orchid/50 focus:outline-none"
                  >
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
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
                <Zap size={20} /> Calculate &amp; Plan Road Network Route
              </button>
            </GlassCard>
          </motion.div>
        )}

        {/* ANALYZING */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-16"
          >
            <div className="ai-spinner !w-16 !h-16 !border-4" />
            <p className="text-white font-semibold text-lg mt-6">Connecting to Routing Provider</p>
            <div className="mt-8 space-y-3 w-96">
              {ANALYSIS_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  {i < stepsDone ? (
                    <CheckCircle2 size={18} className="text-safe" />
                  ) : i === stepsDone ? (
                    <div className="ai-spinner !w-4 !h-4 !border-2" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/10" />
                  )}
                  <span
                    className={`text-sm ${
                      i < stepsDone ? 'text-safe' : i === stepsDone ? 'text-orchid' : 'text-mist-muted'
                    }`}
                  >
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* RESULTS */}
        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {errorMsg ? (
              <div className="p-8 rounded-2xl bg-slate-900/80 border border-rose-800/40 text-center space-y-5 max-w-xl mx-auto shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Route Calculation Notice</h3>
                  <p className="text-sm text-rose-200/90 mt-2 leading-relaxed">{errorMsg}</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={analyze}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-600/30"
                  >
                    Retry Calculation
                  </button>
                  <button
                    onClick={() => {
                      setPhase('form');
                      setErrorMsg(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
                  >
                    Edit Origin &amp; Destination
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header & Provenance */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {planData?.provenance?.cacheStatus || 'LIVE'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Provider: <strong className="text-slate-200">{planData?.provider || 'OSRM Engine'}</strong>
                      </span>
                      {planData?.provenance?.latencyMs && (
                        <span className="text-xs text-slate-500">
                          ({planData.provenance.latencyMs}ms)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Route Calculated: {LOCATIONS.find((l) => l.id === form.origin_id)?.name} →{' '}
                      {LOCATIONS.find((l) => l.id === form.destination_id)?.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveCorridor}
                      disabled={savingCorridor || corridorSaved}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Bookmark size={14} className={corridorSaved ? 'text-brand-teal' : ''} />
                      {corridorSaved ? 'Corridor Saved' : savingCorridor ? 'Saving...' : 'Save Corridor'}
                    </button>
                    <button
                      onClick={() => {
                        setPhase('form');
                        setResult(null);
                        setPlanData(null);
                      }}
                      className="text-xs text-brand-teal hover:underline font-medium"
                    >
                      ← New Calculation
                    </button>
                  </div>
                </div>

                {/* Metrics Ribbon */}
                {planData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Total Distance</div>
                      <div className="text-2xl font-bold text-white mt-1">{planData.distanceKm} km</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Real road geometry</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Est. Duration</div>
                      <div className="text-2xl font-bold text-cyan-400 mt-1">
                        {Math.floor(planData.durationMinutes / 60)}h {planData.durationMinutes % 60}m
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Terrain-adjusted time</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Elevation Gain</div>
                      <div className="text-2xl font-bold text-amber-400 mt-1 flex items-center gap-1">
                        <Mountain size={20} />
                        +{planData.elevationGainMeters} m
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Himalayan ascent</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Max Gradient</div>
                      <div className="text-2xl font-bold text-rose-400 mt-1 flex items-center gap-1">
                        <Gauge size={20} />
                        {planData.maxGradientPct || 18}%
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Mountain pass slope</div>
                    </div>
                  </div>
                )}

                {/* Map Display */}
                {planData?.coordinates && planData.coordinates.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden p-1 shadow-xl">
                    <DispatchMap
                      height="480px"
                      routes={[
                        {
                          id: 'planned-route-1',
                          coordinates: planData.coordinates,
                          color: '#0D9488', // Teal
                          label: 'Primary Calculated Corridor',
                        },
                      ]}
                      initialCenter={
                        planData.coordinates[0]
                          ? [planData.coordinates[0][0], planData.coordinates[0][1]]
                          : [91.7362, 26.1445]
                      }
                      initialZoom={8}
                    />
                  </div>
                )}

                {/* Evaluated Corridor Alternatives (Section 4) */}
                {planData?.alternatives && planData.alternatives.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Compass size={16} className="text-emerald-400" />
                      Evaluated Route Alternatives ({planData.alternatives.length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {planData.alternatives.map((alt: any) => (
                        <div key={alt.id} className="p-4 rounded-xl bg-forest-900/60 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm">{alt.name}</span>
                            <Badge variant={alt.riskSeverity === 'LOW' ? 'LOW' : alt.riskSeverity === 'MEDIUM' ? 'MODERATE' : 'HIGH'}>
                              Risk: {alt.riskScore}/100 ({alt.riskSeverity})
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                            <div>
                              <span className="text-slate-400">Distance:</span> {alt.distanceKm} km
                            </div>
                            <div>
                              <span className="text-slate-400">ETA:</span> {alt.formattedEta}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                            <strong className="text-slate-300">Alternative Rationale:</strong> {alt.reasonForAlternative}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route Segments Breakdown */}
                {planData?.segments && planData.segments.length > 0 && (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Layers size={16} className="text-brand-teal" />
                      Corridor Segments Breakdown ({planData.segments.length} sectors)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950/40 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5">Sector</th>
                            <th className="px-4 py-2.5">Highway</th>
                            <th className="px-4 py-2.5">Distance</th>
                            <th className="px-4 py-2.5">Duration</th>
                            <th className="px-4 py-2.5">Terrain</th>
                            <th className="px-4 py-2.5">Condition</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {planData.segments.map((seg: any) => (
                            <tr key={seg.segmentOrder} className="hover:bg-slate-800/30">
                              <td className="px-4 py-3 font-medium text-white">{seg.name}</td>
                              <td className="px-4 py-3 font-mono text-slate-400">{seg.highwayCode || 'Corridor Link'}</td>
                              <td className="px-4 py-3 font-semibold text-slate-200">{seg.distanceKm} km</td>
                              <td className="px-4 py-3">{seg.durationMinutes} min</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    seg.terrain === 'MOUNTAINOUS'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : seg.terrain === 'HILLY'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-blue-950 text-blue-300 border border-blue-800'
                                  }`}
                                >
                                  {seg.terrain}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono">{seg.roadConditionScore}/100</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
