'use client';
import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import KPICard from '@/components/ui/KPICard';
import ProgressBar from '@/components/ui/ProgressBar';
import type { AnalyticsData } from '@/lib/types';
import { BarChart3, Clock, AlertTriangle, MapPin, Truck, IndianRupee, Route, TrendingDown } from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  useEffect(() => { authFetch('/api/analytics').then(r => r.json()).then(setData); }, []);

  if (!data) return <div className="flex justify-center py-16"><div className="ai-spinner" /></div>;

  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><BarChart3 size={28} className="text-orchid" /> Analytics &amp; Reports</h1>
        <p className="text-mist-muted text-sm mt-1">Platform performance metrics</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Avg Delivery Time" value={data.kpis.avgDeliveryTimeHrs} suffix="hrs" icon={Clock} color="orchid" />
        <KPICard title="Avg Route Risk" value={data.kpis.avgRouteRisk} suffix="/100" icon={AlertTriangle} color="amber" />
        <KPICard title="Emergency Response" value={data.kpis.emergencyResponseTimeHrs} suffix="hrs" icon={Route} color="danger" />
        <KPICard title="Failure Rate" value={data.kpis.routeFailureRatePct} suffix="%" icon={TrendingDown} color="danger" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KPICard title="Regional Accessibility" value={data.kpis.regionalAccessibilityPct} suffix="%" icon={MapPin} color="teal" />
        <KPICard title="Vehicle Utilization" value={data.kpis.vehicleUtilizationPct} suffix="%" icon={Truck} color="safe" />
        <KPICard title="Avg Cost/Delivery" value={data.kpis.avgCostPerDeliveryInr} suffix="" icon={IndianRupee} color="info" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Delivery Trends */}
        <GlassCard className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Monthly Delivery Trends</h3>
          <div className="space-y-3">
            {data.deliveryTrends.map(t => (
              <div key={t.month} className="flex items-center gap-3">
                <span className="w-8 text-xs text-mist-muted font-mono">{t.month}</span>
                <div className="flex-1"><ProgressBar value={t.deliveries} max={150} color="orchid" /></div>
                <div className="flex gap-3 text-xs w-36">
                  <span className="text-mist">{t.deliveries} total</span>
                  <span className="text-amber">{t.delays} delays</span>
                  <span className="text-danger">{t.emergency} emg</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk by State */}
        <GlassCard className="p-5">
          <h3 className="text-base font-bold text-white mb-4">Risk by State</h3>
          <div className="space-y-3">
            {data.riskByState.sort((a, b) => b.avgRisk - a.avgRisk).map(s => (
              <div key={s.state} className="flex items-center gap-3">
                <span className="w-36 text-sm text-mist truncate">{s.state}</span>
                <div className="flex-1"><ProgressBar value={s.avgRisk} color={s.avgRisk > 60 ? 'danger' : s.avgRisk > 45 ? 'amber' : 'safe'} /></div>
                <span className="text-xs font-mono text-white w-8 text-right">{s.avgRisk}</span>
                <span className="text-xs text-mist-muted w-12">{s.incidents} inc.</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Accessibility by State */}
        <GlassCard className="p-5 md:col-span-2">
          <h3 className="text-base font-bold text-white mb-4">Accessibility by State</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.accessibilityByState.sort((a, b) => a.score - b.score).map(s => (
              <div key={s.state} className="text-center p-4 rounded-lg bg-white/[0.02]">
                <p className="text-2xl font-black font-mono text-white">{s.score}</p>
                <ProgressBar value={s.score} color={s.score >= 65 ? 'safe' : s.score >= 50 ? 'info' : 'danger'} className="mt-2" />
                <p className="text-xs text-mist-muted mt-2">{s.state}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
