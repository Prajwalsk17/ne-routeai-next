'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import KPICard from '@/components/ui/KPICard';
import EmptyState from '@/components/ui/EmptyState';
import dynamic from 'next/dynamic';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] bg-[#0F1714] rounded-xl flex flex-col items-center justify-center border border-white/5 gap-2">
      <div className="ai-spinner" />
      <span className="text-xs text-mist-dim font-medium">Initializing Hazard Radar...</span>
    </div>
  ),
});

import {
  ShieldAlert,
  Mountain,
  MapPin,
  RefreshCw,
  AlertTriangle,
  Radio,
  Clock,
  Layers,
  Compass,
  CheckCircle2,
  TrendingUp,
  CloudRain,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useStore } from '@/lib/store';
import { RiskItem } from '@/lib/types/risk';

interface RiskEventItem {
  id: string;
  eventCode: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  title: string;
  description: string;
  state: string;
  coordinates: { lat: number; lng: number };
  affectedRadiusMeters: number;
  affectedCorridors?: string[];
  reportedAt: string;
  confidence?: number;
  provenance?: {
    sourceProvider?: string;
    sourceCode?: string;
    externalRecordId?: string;
  };
}

interface HazardIntersection {
  hazardId: string;
  title: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  state: string;
  source: string;
  distanceToRouteKm: number;
  isDirectBlockage: boolean;
  recommendedAction: string;
  warningMessage: string;
  dataStatus: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
}

export default function RiskPage() {
  const sharedRoute = useStore((s) => s.sharedRoute);
  const setActiveRisks = useStore((s) => s.setActiveRisks);

  const [events, setEvents] = useState<RiskEventItem[]>([]);
  const [canonicalItems, setCanonicalItems] = useState<RiskItem[]>([]);
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<RiskEventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [intersections, setIntersections] = useState<HazardIntersection[]>([]);

  const NER_STATES = [
    'Assam',
    'Arunachal Pradesh',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Sikkim',
    'Tripura',
  ];

  const fetchRiskEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        selectedState === 'ALL'
          ? '/api/v1/risk/events?limit=50'
          : `/api/v1/risk/events?state=${encodeURIComponent(selectedState)}&limit=50`;
      const res = await authFetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load risk events: HTTP ${res.status}`);
      }
      const json = await res.json();
      const items: RiskEventItem[] = json.data?.events || json.events || [];
      const canonicals: RiskItem[] = json.data?.canonicalItems || [];

      setEvents(items);
      setCanonicalItems(canonicals);
      if (canonicals.length > 0) {
        setActiveRisks(canonicals);
      }

      if (items.length > 0) {
        setSelectedEvent(items[0]);
      } else {
        setSelectedEvent(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Risk data temporarily unavailable.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskEvents();
  }, [selectedState]);

  // If a shared route exists, automatically run corridor risk assessment
  const handleCalculateRouteRisk = async () => {
    setCalculationError(null);

    // Require real route segments - zero fabrication invariant
    if (!sharedRoute || !sharedRoute.segments || sharedRoute.segments.length === 0) {
      setCalculationError('Insufficient verified data for risk assessment. Please plan a corridor in Smart Route AI first.');
      return;
    }

    setCalculating(true);
    try {
      const payload: any = {
        trip_id: sharedRoute.routeId,
        shipment_id: 'live-risk-assessment',
        route_segments: sharedRoute.segments.map((seg, idx) => ({
          segment_order: idx + 1,
          start_point: seg.startPoint,
          end_point: seg.endPoint,
          road_condition_score: seg.roadConditionScore ?? 75,
          gradient_slope_percent: seg.gradientSlopePercent ?? 12,
          terrain: seg.terrain ?? 'MOUNTAINOUS',
          highway_code: seg.highwayCode ?? 'NH-27',
        })),
        vehicle_location: sharedRoute.originCoords
          ? { lat: sharedRoute.originCoords.lat, lng: sharedRoute.originCoords.lng }
          : undefined,
        options: {
          include_ai_reasoning: true,
        },
      };

      if (sharedRoute.coordinates && sharedRoute.coordinates.length > 0) {
        payload.route_coordinates = sharedRoute.coordinates;
      }

      const res = await authFetch('/api/v1/risk/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setCalculationResult(data.data);
        if (data.data.routeHazardIntersections) {
          setIntersections(data.data.routeHazardIntersections);
        }
      } else {
        setCalculationError(data.error?.message || 'Risk data temporarily unavailable.');
      }
    } catch {
      setCalculationError('Risk data temporarily unavailable.');
    } finally {
      setCalculating(false);
    }
  };

  const severityBadgeVariant = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MODERATE';
      default:
        return 'LOW';
    }
  };

  const activeCount = events.filter((e) => e.status === 'ACTIVE').length;
  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = events.filter((e) => e.severity === 'HIGH').length;

  // Map incidents preparation for DispatchMap
  const mapIncidents = useMemo(() => {
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.category,
      severity: e.severity,
      coordinates: e.coordinates,
      affectedRadiusMeters: e.affectedRadiusMeters,
    }));
  }, [events]);

  // Route overlay preparation for DispatchMap
  const mapRoutes = useMemo(() => {
    if (!sharedRoute || !sharedRoute.coordinates || sharedRoute.coordinates.length === 0) {
      return [];
    }
    return [
      {
        id: sharedRoute.routeId,
        name: `${sharedRoute.originId} to ${sharedRoute.destinationId}`,
        color: '#f59e0b',
        severity: calculationResult?.severity || 'MEDIUM',
        coordinates: sharedRoute.coordinates,
      },
    ];
  }, [sharedRoute, calculationResult]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <ShieldAlert size={28} className="text-amber" /> Predictive Risk Intelligence
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Institutional meteorological, topographical &amp; corridor hazard radar across 8 Northeast states
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRiskEvents}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-mist font-semibold text-xs flex items-center gap-2 border border-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber' : ''} />
            Refresh Feeds
          </button>

          <button
            onClick={handleCalculateRouteRisk}
            disabled={calculating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber to-amber-dark text-forest-900 font-bold text-xs flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {calculating ? <RefreshCw className="animate-spin" size={14} /> : <Radio size={14} />}
            Analyze Active Route Risk
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Active Hazards"
          value={activeCount}
          suffix="bulletins"
          icon={ShieldAlert}
          color={activeCount > 0 ? 'amber' : 'safe'}
        />
        <KPICard
          title="Critical Blockages"
          value={criticalCount}
          suffix="severe"
          icon={AlertTriangle}
          color={criticalCount > 0 ? 'danger' : 'safe'}
        />
        <KPICard
          title="High Vulnerability"
          value={highCount}
          suffix="passes"
          icon={Mountain}
          color={highCount > 0 ? 'amber' : 'safe'}
        />
        <KPICard
          title="Verified Sources"
          value="BRO • IMD • CWC"
          suffix="institutional feeds"
          icon={CheckCircle2}
          color="safe"
        />
      </div>

      {/* Calculation Error Notice */}
      {calculationError && (
        <GlassCard variant="danger" className="p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="text-amber flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-semibold text-white">{calculationError}</p>
              <p className="text-[11px] text-mist-dim mt-0.5">
                The risk intelligence engine operates strictly on verified corridor geometry and telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCalculationError(null)}
            className="text-xs text-mist-muted hover:text-white px-2 py-1 rounded bg-white/5"
          >
            Dismiss
          </button>
        </GlassCard>
      )}

      {/* Shared Route Linkage Card (if route is active in store) */}
      {sharedRoute && (
        <GlassCard className="p-4 border-amber/30 bg-amber/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber/10 border border-amber/30 flex items-center justify-center text-amber">
                <Compass size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Active Route Linked from Smart Route AI
                  </span>
                  <Badge variant="LOW">{sharedRoute.transportMode}</Badge>
                </div>
                <p className="text-xs text-mist-dim mt-0.5">
                  <span className="text-white font-semibold">{sharedRoute.originId}</span>
                  <ArrowRight size={12} className="inline mx-1 text-mist-muted" />
                  <span className="text-white font-semibold">{sharedRoute.destinationId}</span>
                  <span className="mx-2 text-mist-muted">•</span>
                  <span>{sharedRoute.distanceKm} km</span>
                  <span className="mx-2 text-mist-muted">•</span>
                  <span>ETA {sharedRoute.formattedEta}</span>
                  <span className="mx-2 text-mist-muted">•</span>
                  <span>Provider: {sharedRoute.provider}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handleCalculateRouteRisk}
              disabled={calculating}
              className="px-3.5 py-1.5 rounded-lg bg-amber text-forest-900 font-bold text-xs hover:bg-amber-light transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {calculating ? <RefreshCw className="animate-spin" size={13} /> : <TrendingUp size={13} />}
              Scan Route Against Hazards
            </button>
          </div>
        </GlassCard>
      )}

      {/* Corridor Risk Evaluation Result Card */}
      <AnimatePresence>
        {calculationResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard
              variant={calculationResult.severity === 'CRITICAL' ? 'danger' : 'default'}
              className="p-5 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      calculationResult.severity === 'CRITICAL'
                        ? 'bg-danger/20 text-danger-light'
                        : calculationResult.severity === 'HIGH'
                        ? 'bg-amber/20 text-amber'
                        : 'bg-safe/20 text-safe-light'
                    }`}
                  >
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dynamic 5-Factor Risk Assessment Evaluated</h3>
                    <p className="text-[0.7rem] text-mist-muted">
                      Deterministic multi-factor algorithm calculated via live institutional observations
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCalculationResult(null)}
                  className="text-xs text-mist-muted hover:text-white px-2 py-1 rounded bg-white/5"
                >
                  Dismiss
                </button>
              </div>

              {/* 5-Factor Metric Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-forest-900/60 border border-white/5">
                  <p className="text-[0.7rem] text-mist-muted mb-0.5">Composite Risk Score</p>
                  <p className="text-xl font-mono font-bold text-white">
                    {calculationResult.displayScore}/100
                  </p>
                  <Badge variant={severityBadgeVariant(calculationResult.severity)} className="mt-1 text-[0.65rem]">
                    {calculationResult.severity}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-forest-900/60 border border-white/5">
                  <p className="text-[0.7rem] text-mist-muted mb-0.5">Infrastructure (35%)</p>
                  <p className="text-base font-mono font-bold text-white">
                    {Math.round((calculationResult.subIndices?.infrastructure ?? 0.2) * 100)}%
                  </p>
                  <p className="text-[0.65rem] text-mist-muted mt-1">Passability &amp; Surface</p>
                </div>

                <div className="p-3 rounded-xl bg-forest-900/60 border border-white/5">
                  <p className="text-[0.7rem] text-mist-muted mb-0.5">Meteorology (30%)</p>
                  <p className="text-base font-mono font-bold text-white">
                    {Math.round((calculationResult.subIndices?.meteorological ?? 0.15) * 100)}%
                  </p>
                  <p className="text-[0.65rem] text-mist-muted mt-1">Rain, Wind &amp; Vis</p>
                </div>

                <div className="p-3 rounded-xl bg-forest-900/60 border border-white/5">
                  <p className="text-[0.7rem] text-mist-muted mb-0.5">Topography (20%)</p>
                  <p className="text-base font-mono font-bold text-white">
                    {Math.round((calculationResult.subIndices?.topographical ?? 0.45) * 100)}%
                  </p>
                  <p className="text-[0.65rem] text-mist-muted mt-1">Slope &amp; Elevation</p>
                </div>
              </div>

              {/* AI Operational Narrative */}
              {calculationResult.aiInterpretation && (
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1.5">
                  <p className="text-amber font-semibold text-[0.75rem] flex items-center gap-1.5">
                    <Radio size={13} /> Operational Advisory:
                  </p>
                  <p className="text-mist-dim leading-relaxed">
                    {calculationResult.aiInterpretation.operationalImplication}
                  </p>
                  <p className="text-mist-muted text-[0.7rem]">
                    {calculationResult.aiInterpretation.suggestedAction}
                  </p>
                </div>
              )}

              {/* Intersecting Hazards Warning Section */}
              {intersections.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <h4 className="text-xs font-bold text-amber flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} />
                    {intersections.length} Active Hazard(s) Intersecting This Corridor
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {intersections.map((haz) => (
                      <div
                        key={haz.hazardId}
                        className="p-2.5 rounded-lg bg-black/40 border border-amber/20 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-white">{haz.title}</p>
                          <p className="text-[0.7rem] text-mist-muted mt-0.5">
                            {haz.state} • {haz.distanceToRouteKm} km from route
                          </p>
                          <p className="text-[0.7rem] text-amber mt-1">{haz.recommendedAction}</p>
                        </div>
                        <Badge variant={severityBadgeVariant(haz.severity)}>{haz.severity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regional State Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedState('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            selectedState === 'ALL'
              ? 'bg-amber text-forest-900 shadow font-bold'
              : 'bg-white/[0.04] text-mist-dim hover:bg-white/[0.08]'
          }`}
        >
          All NER States
        </button>
        {NER_STATES.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedState(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedState === st
                ? 'bg-amber text-forest-900 shadow font-bold'
                : 'bg-white/[0.04] text-mist-dim hover:bg-white/[0.08]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Interactive Situational Map */}
      <GlassCard className="p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-amber" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Northeast Corridor Situational Hazard Radar
            </h3>
          </div>
          <span className="text-[0.7rem] text-mist-muted">
            {events.length} active hazard incidents rendered
          </span>
        </div>
        <div className="h-[380px] rounded-xl overflow-hidden border border-white/5 relative">
          <DispatchMap
            height="380px"
            incidents={mapIncidents}
            routes={mapRoutes}
            showLayerControls={true}
            selectedIncidentId={selectedEvent?.id}
            onIncidentClick={(id) => {
              const ev = events.find((e) => e.id === id);
              if (ev) setSelectedEvent(ev);
            }}
          />
        </div>
      </GlassCard>

      {/* Error State */}
      {error && (
        <GlassCard variant="danger" className="p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-danger-light flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-white">Risk data temporarily unavailable.</h4>
              <p className="text-xs text-mist-dim mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchRiskEvents}
            className="px-3 py-1.5 rounded-lg bg-danger/20 hover:bg-danger/30 text-white text-xs font-bold transition-all"
          >
            Retry Radar
          </button>
        </GlassCard>
      )}

      {/* Main Content: Hazards List & Detail View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="ai-spinner mb-3" />
          <p className="text-xs text-mist-muted">Polling Northeast emergency hazard telemetry...</p>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No verified risk data available."
          description={`There are currently no verified active road or weather hazard advisories recorded for ${
            selectedState === 'ALL' ? 'Northeast India' : selectedState
          }.`}
          primaryAction={{
            label: 'Refresh Radar',
            onClick: fetchRiskEvents,
          }}
        />
      ) : (
        <div className="grid xl:grid-cols-3 gap-5">
          {/* Hazards List */}
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert size={16} className="text-amber" />
                Monitored Hazard Bulletins ({events.length})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {events.map((ev) => {
                const canonical = canonicalItems.find((c) => c.id === ev.id);
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`w-full p-3.5 rounded-xl transition-all text-left border ${
                      isSelected
                        ? 'bg-amber/10 border-amber/40 shadow-md text-white'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] text-mist-dim'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-white line-clamp-1">{ev.title}</span>
                      <Badge variant={severityBadgeVariant(ev.severity)}>{ev.severity}</Badge>
                    </div>

                    <p className="text-[0.7rem] text-mist-muted mb-2">
                      {ev.state} • {ev.category.replace(/_/g, ' ')}
                    </p>

                    <div className="flex items-center justify-between text-[0.68rem] pt-1.5 border-t border-white/5">
                      <span className="text-mist-dim truncate max-w-[170px]">
                        {ev.provenance?.sourceProvider || 'Institutional Bulletin'}
                      </span>
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[0.62rem] ${
                          canonical?.dataStatus === 'LIVE'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {canonical?.dataStatus || 'LIVE'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Hazard Detail Card */}
          <div className="xl:col-span-2">
            {selectedEvent ? (
              <GlassCard className="p-6 space-y-5">
                {/* Detail Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={severityBadgeVariant(selectedEvent.severity)}>
                        {selectedEvent.severity} PRIORITY
                      </Badge>
                      <span className="text-xs text-mist-muted">
                        Code: <span className="font-mono text-white">{selectedEvent.eventCode}</span>
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                    <p className="text-xs text-mist-muted mt-1">
                      Region: <span className="text-white font-medium">{selectedEvent.state}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[0.7rem] font-bold">
                      OFFICIAL DISASTER ADVISORY
                    </span>
                    <p className="text-[0.68rem] text-mist-muted mt-1">
                      Reported: {new Date(selectedEvent.reportedAt).toLocaleDateString()} {new Date(selectedEvent.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Narrative Description */}
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                    Official Incident Statement
                  </h4>
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-mist leading-relaxed font-sans">
                    {selectedEvent.description}
                  </div>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-forest-900/60 border border-white/5 space-y-1.5">
                    <p className="text-mist-muted font-medium text-[0.7rem]">Geographic Coordinates</p>
                    <p className="text-white font-mono font-semibold">
                      {selectedEvent.coordinates.lat.toFixed(4)}° N, {selectedEvent.coordinates.lng.toFixed(4)}° E
                    </p>
                    <p className="text-[0.7rem] text-mist-dim">
                      Impact Radius: {(selectedEvent.affectedRadiusMeters / 1000).toFixed(1)} km corridor zone
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-forest-900/60 border border-white/5 space-y-1.5">
                    <p className="text-mist-muted font-medium text-[0.7rem]">Affected Highway Corridors</p>
                    <p className="text-white font-semibold">
                      {selectedEvent.affectedCorridors && selectedEvent.affectedCorridors.length > 0
                        ? selectedEvent.affectedCorridors.join(', ')
                        : 'Local Mountain Corridor'}
                    </p>
                    <p className="text-[0.7rem] text-mist-dim">
                      Status: <span className="text-amber font-semibold">{selectedEvent.status}</span>
                    </p>
                  </div>
                </div>

                {/* Institutional Provenance & Attribution */}
                <div className="p-4 rounded-xl bg-forest-900/80 border border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-safe" />
                    Institutional Data Provenance &amp; Attribution
                  </h4>
                  <div className="grid sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-[0.68rem] text-mist-muted">Authoritative Source</p>
                      <p className="text-white font-semibold text-[0.75rem] truncate">
                        {selectedEvent.provenance?.sourceProvider || 'Government Portal'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] text-mist-muted">Source Code / Record</p>
                      <p className="text-white font-mono text-[0.75rem] truncate">
                        {selectedEvent.provenance?.externalRecordId || selectedEvent.provenance?.sourceCode || 'OFFICIAL_FEED'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] text-mist-muted">Data Freshness</p>
                      <p className="text-emerald-400 font-semibold text-[0.75rem]">
                        {canonicalItems.find((c) => c.id === selectedEvent.id)?.dataStatus || 'LIVE'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.68rem] text-mist-muted">Confidence Rating</p>
                      <p className="text-safe-light font-bold text-[0.75rem]">
                        {Math.round((selectedEvent.confidence ?? 0.92) * 100)}% Verified
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommended Operational Action */}
                <div className="p-4 rounded-xl bg-amber/5 border border-amber/20 space-y-1">
                  <h4 className="text-xs font-bold text-amber flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Recommended Transport Action
                  </h4>
                  <p className="text-xs text-mist-dim leading-relaxed">
                    {selectedEvent.severity === 'CRITICAL'
                      ? 'Corridor closed to heavy multi-axle freight. Stage consignment at nearest transshipment yard or reroute via secondary mountain corridor.'
                      : selectedEvent.severity === 'HIGH'
                      ? 'Reduce vehicle speed by 30%. Daylight convoy operation recommended. Ensure tire chains and emergency recovery gear are equipped.'
                      : 'Maintain standard vigilance. Monitor real-time state disaster management bulletin pings.'}
                  </p>
                </div>
              </GlassCard>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
