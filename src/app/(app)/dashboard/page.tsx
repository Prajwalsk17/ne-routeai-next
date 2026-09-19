'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Activity, AlertTriangle, Truck, Route as RouteIcon, MapPin, Siren, TrendingDown, Package } from 'lucide-react';
import KPICard from '@/components/ui/KPICard';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import type { DashboardStats, Delivery, Alert } from '@/lib/types';
import { authFetch } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => <div className="h-[420px] bg-forest-200 rounded-xl flex items-center justify-center"><div className="ai-spinner" /></div> });

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    authFetch('/api/dashboard').then(r => r.json()).then(setStats);
    authFetch('/api/deliveries/active').then(r => r.json()).then(setDeliveries);
    authFetch('/api/alerts').then(r => r.json()).then(setAlerts);
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="ai-spinner" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white">Command Center</h1>
        <p className="text-mist-muted text-sm mt-1">Real-time logistics intelligence overview</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KPICard title="Active Deliveries" value={stats.activeDeliveries} icon={Package} color="orchid" trend={{ value: 8, label: 'vs last week' }} />
        <KPICard title="High-Risk Routes" value={stats.highRiskRoutes} icon={AlertTriangle} color="danger" trend={{ value: -3, label: 'improving' }} />
        <KPICard title="Disruptions" value={stats.disruptions} icon={TrendingDown} color="amber" />
        <KPICard title="Emergency Missions" value={stats.emergencyMissions} icon={Siren} color="danger" />
        <KPICard title="Accessibility Index" value={stats.regionalAccessibility} suffix="%" icon={MapPin} color="teal" trend={{ value: 2, label: 'improvement' }} />
        <KPICard title="Active Vehicles" value={stats.activeVehicles} icon={Truck} color="safe" trend={{ value: 5, label: 'on road' }} />
      </div>

      {/* Main Grid: Map + Side Panels */}
      <div className="grid xl:grid-cols-3 gap-5">
        {/* Map placeholder + Active deliveries */}
        <div className="xl:col-span-2 space-y-5">
          <GlassCard className="p-0 overflow-hidden">
            <div className="relative">
              <MapView height="420px" />
              <div className="absolute top-4 left-4 z-[1000] flex gap-2">
                <Badge variant="ai" dot>AI Routing Active</Badge>
              </div>
              <div className="absolute bottom-4 left-16 right-4 z-[1000] flex gap-3">
                <div className="flex-1 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border-l-[3px] border-safe flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-safe animate-pulse" /><span className="text-[0.7rem] text-white">{deliveries.filter(d => d.status === 'IN_TRANSIT').length} Vehicles In Transit</span>
                </div>
                <div className="flex-1 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border-l-[3px] border-amber flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber animate-pulse" /><span className="text-[0.7rem] text-white">{alerts.filter(a => a.severity === 'CRITICAL').length} Critical Alerts</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Active Deliveries */}
          <GlassCard className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Active Deliveries</h3>
              <Badge variant="ai">{deliveries.length} tracked</Badge>
            </div>
            <div className="space-y-3">
              {deliveries.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-orchid/[0.04] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white font-mono">{d.id}</span>
                      <Badge variant={d.priority}>{d.priority}</Badge>
                      <Badge variant={d.risk}>{d.status}</Badge>
                    </div>
                    <p className="text-xs text-mist-muted mt-1">{d.cargoType} • {d.cargoWeightKg}kg • ETA {d.etaHours}h</p>
                    <p className="text-xs text-mist-muted">{(d.origin as any)?.name || d.originId} → {(d.destination as any)?.name || d.destinationId}</p>
                  </div>
                  <div className="w-32">
                    <ProgressBar value={d.progressPct} color={d.risk === 'HIGH' ? 'amber' : d.risk === 'CRITICAL' ? 'danger' : 'safe'} showLabel />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Alerts Feed */}
          <GlassCard className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">Alert Feed</h3>
              <Badge variant="CRITICAL" dot>{alerts.filter(a => a.severity === 'CRITICAL').length} critical</Badge>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {alerts.slice(0, 6).map(a => (
                <div key={a.id} className={`p-3 rounded-lg border-l-[3px] bg-white/[0.02] ${a.severity === 'CRITICAL' ? 'border-danger' : a.severity === 'WARNING' ? 'border-amber' : 'border-info'}`}>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.severity as any}>{a.severity}</Badge>
                    <span className="text-xs text-white font-semibold">{a.title}</span>
                  </div>
                  <p className="text-xs text-mist-muted mt-1 line-clamp-2">{a.message}</p>
                  <p className="text-[0.65rem] text-mist-muted mt-1">📍 {a.location}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Risk Summary */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-white mb-4">Risk Snapshot</h3>
            {['Silchar', 'Aizawl', 'Karong', 'Senapati'].map((name, i) => {
              const risk = [72, 70, 78, 67][i];
              return (
                <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-sm text-mist">{name}</span>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={risk} color={risk > 70 ? 'danger' : 'amber'} className="w-20" />
                    <span className="text-xs font-mono text-white w-8 text-right">{risk}</span>
                  </div>
                </div>
              );
            })}
          </GlassCard>

          {/* System Status */}
          <GlassCard className="p-5">
            <h3 className="text-base font-bold text-white mb-3">System Status</h3>
            <div className="space-y-2">
              {[
                { label: 'Route Engine', status: 'ONLINE', color: 'safe' },
                { label: 'Risk Prediction', status: 'ONLINE', color: 'safe' },
                { label: 'AI Copilot', status: 'BETA', color: 'orchid' },
                { label: 'Data Source', status: 'LIVE', color: 'safe' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-mist-dim">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-${s.color} animate-pulse`} />
                    <span className={`text-xs text-${s.color} font-semibold`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
