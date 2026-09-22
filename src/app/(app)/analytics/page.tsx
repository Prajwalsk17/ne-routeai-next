'use client';

import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import KPICard from '@/components/ui/KPICard';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import {
  AnalyticsSummaryReport,
  DateRangePreset,
  AggregationInterval,
} from '@/lib/types/analytics';
import {
  BarChart3,
  Clock,
  AlertTriangle,
  MapPin,
  Truck,
  IndianRupee,
  Route,
  TrendingDown,
  Download,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Hash,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsSummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DateRangePreset>('30D');
  const [interval, setInterval] = useState<AggregationInterval>('DAILY');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v1/analytics/summary?preset=${preset}&interval=${interval}`);
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
      } else {
        setError(json.error?.message || 'Unable to aggregate analytics metrics.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error while loading analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [preset, interval]);

  const handleExportCSV = () => {
    window.open(`/api/v1/analytics/export?preset=${preset}&interval=${interval}&format=CSV`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <BarChart3 size={28} className="text-orchid" /> Analytics &amp; Corridor Performance
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Real-time strategic performance, mountain reliability, and fleet efficiency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center bg-forest-200/80 rounded-lg p-1 border border-white/[0.08]">
            {(['7D', '30D', '90D'] as DateRangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  preset === p
                    ? 'bg-orchid text-white shadow-sm'
                    : 'text-mist-dim hover:text-white'
                }`}
              >
                {p === '7D' ? 'Last 7 Days' : p === '30D' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>

          {/* Interval Selector */}
          <div className="flex items-center bg-forest-200/80 rounded-lg p-1 border border-white/[0.08]">
            {(['DAILY', 'WEEKLY', 'MONTHLY'] as AggregationInterval[]).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  interval === i
                    ? 'bg-teal text-white shadow-sm'
                    : 'text-mist-dim hover:text-white'
                }`}
              >
                {i.charAt(0) + i.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] transition-all"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Provenance & Freshness Bar */}
      {report && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-lg bg-forest-200/40 border border-white/[0.06] text-xs text-mist-dim">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-safe font-medium">
              <span className="w-2 h-2 rounded-full bg-safe animate-pulse" /> {report.dataFreshness}
            </span>
            <span>• As of {new Date(report.asOfTimestamp).toLocaleTimeString()}</span>
            <span>• Org: {report.organizationId}</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-mist-muted">
            <Hash size={12} />
            <span>SHA-256: {report.provenanceHash.slice(0, 12)}...</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="ai-spinner" />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-glass bg-danger/10 border border-danger/20 text-center">
          <AlertTriangle size={32} className="text-danger mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white mb-1">Failed to Load Analytics</h3>
          <p className="text-mist text-sm mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-danger text-white hover:bg-danger/80"
          >
            Retry Aggregation
          </button>
        </div>
      )}

      {/* Zero Fabrication: Empty / Insufficient Data State */}
      {!loading && !error && report && !report.hasSufficientData && (
        <EmptyState
          icon={Calendar}
          title="Insufficient Trip History for Selected Date Range"
          description={
            report.insufficientDataReason ||
            'There are no recorded trips or deliveries in this window. Metrics will automatically calculate once live operations commence.'
          }
          primaryAction={{
            label: 'View All Active Trips',
            href: '/routes',
          }}
        />
      )}

      {/* Populated Real Data State */}
      {!loading && !error && report && report.hasSufficientData && (
        <>
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              title="Total Trips"
              value={report.kpis.totalTrips}
              suffix=""
              icon={Route}
              color="orchid"
            />
            <KPICard
              title="On-Time Delivery"
              value={report.kpis.onTimeDeliveryRatePct !== null ? report.kpis.onTimeDeliveryRatePct : '—'}
              suffix={report.kpis.onTimeDeliveryRatePct !== null ? '%' : ''}
              icon={Clock}
              color="safe"
            />
            <KPICard
              title="Avg Transit Delay"
              value={report.kpis.avgTransitDelayMinutes !== null ? report.kpis.avgTransitDelayMinutes : '—'}
              suffix={report.kpis.avgTransitDelayMinutes !== null ? ' min' : ''}
              icon={TrendingDown}
              color={
                (report.kpis.avgTransitDelayMinutes || 0) > 30
                  ? 'danger'
                  : (report.kpis.avgTransitDelayMinutes || 0) > 15
                  ? 'amber'
                  : 'safe'
              }
            />
            <KPICard
              title="Disruptions Recorded"
              value={report.kpis.disruptionEventCount}
              suffix=""
              icon={AlertTriangle}
              color={report.kpis.disruptionEventCount > 0 ? 'danger' : 'safe'}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KPICard
              title="Cargo Delivered"
              value={Math.round((report.kpis.cargoMovedKg / 1000) * 10) / 10}
              suffix=" tons"
              icon={Truck}
              color="teal"
            />
            <KPICard
              title="Active Corridors"
              value={report.kpis.activeCorridorsCount}
              suffix=""
              icon={MapPin}
              color="info"
            />
            <KPICard
              title="Driver Safety Score"
              value={report.driverCompliance.avgSafetyScore}
              suffix="/100"
              icon={ShieldCheck}
              color="safe"
            />
          </div>

          {/* Detailed Analytical Views */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Corridor Reliability Breakdown */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span>Corridor Reliability Index</span>
                <span className="text-xs text-mist-dim font-normal font-mono">
                  {report.corridorReliability.length} active sectors
                </span>
              </h3>
              <div className="space-y-3">
                {report.corridorReliability.map((c) => (
                  <div key={c.corridorId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{c.corridorName}</span>
                      <span className="text-mist-dim font-mono">{c.reliabilityScore}/100</span>
                    </div>
                    <ProgressBar
                      value={c.reliabilityScore}
                      color={c.reliabilityScore >= 75 ? 'safe' : c.reliabilityScore >= 50 ? 'amber' : 'danger'}
                    />
                    <div className="flex justify-between text-[11px] text-mist-dim pt-0.5">
                      <span>{c.totalTrips} trips ({c.completedTrips} completed)</span>
                      <span>{c.disruptionCount} delays/disruptions</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Recurrent Mountain Chokepoints */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                <span>Recurrent Road Hazard Chokepoints</span>
                <span className="text-xs text-mist-dim font-normal font-mono">
                  NER Mountain Passes
                </span>
              </h3>
              {report.chokepoints.length === 0 ? (
                <p className="text-xs text-mist-muted py-6 text-center">
                  No active highway blockages or hazard incidents in this date window. Corridors are clear.
                </p>
              ) : (
                <div className="space-y-3">
                  {report.chokepoints.map((chk, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center justify-between text-xs font-semibold text-white">
                        <span>{chk.sectorName}</span>
                        <span className="text-danger font-mono">{chk.disruptionCount} events</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-mist-dim mt-1">
                        <span>{chk.highwayCode} • {chk.state}</span>
                        <span>Avg Closure: ~{chk.avgClosureDurationHours} hrs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Fleet Type Distribution */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-white mb-4">Fleet Efficiency by Chassis Type</h3>
              <div className="space-y-3">
                {report.fleetEfficiency.map((f, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{f.vehicleType}</span>
                      <span className="text-mist-dim font-mono">{f.activeVehicles} active units</span>
                    </div>
                    <ProgressBar value={f.avgPayloadUtilizationPct} color="teal" />
                    <div className="flex justify-between text-[11px] text-mist-dim pt-0.5">
                      <span>Payload Util: {f.avgPayloadUtilizationPct}%</span>
                      <span>Est. Economy: {f.fuelEfficiencyKmPerLiter} km/L</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Timeline Trends */}
            <GlassCard className="p-5">
              <h3 className="text-base font-bold text-white mb-4">Delivery Timeline Volume</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {report.trends.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-mist-muted font-mono">{t.label}</span>
                    <div className="flex-1">
                      <ProgressBar value={t.completedDeliveries} max={Math.max(1, t.totalTrips)} color="orchid" />
                    </div>
                    <div className="flex gap-2 w-28 justify-end text-mist-dim font-mono">
                      <span>{t.completedDeliveries}/{t.totalTrips}</span>
                      {t.emergencyDisruptions > 0 && (
                        <span className="text-danger">({t.emergencyDisruptions}!)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
