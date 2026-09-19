'use client';
import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import KPICard from '@/components/ui/KPICard';
import type { Vehicle } from '@/lib/types';
import { Truck, Fuel, MapPin, Filter } from 'lucide-react';
import { authFetch } from '@/lib/api';

const FILTERS = ['ALL', 'AVAILABLE', 'IN_TRANSIT', 'STANDBY', 'MAINTENANCE'];

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => { authFetch('/api/fleet').then(r => r.json()).then(setVehicles); }, []);

  const filtered = filter === 'ALL' ? vehicles : vehicles.filter(v => v.status === filter);
  const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const transit = vehicles.filter(v => v.status === 'IN_TRANSIT').length;
  const avgFuel = vehicles.length ? Math.round(vehicles.reduce((s, v) => s + v.fuelPct, 0) / vehicles.length) : 0;

  const statusColor = (s: string) => s === 'AVAILABLE' ? 'LOW' : s === 'IN_TRANSIT' ? 'MODERATE' : s === 'STANDBY' ? 'ADVISORY' : 'HIGH';

  return (
    <div>
      <div className="mb-6"><h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3"><Truck size={28} className="text-safe" /> Fleet Management</h1>
        <p className="text-mist-muted text-sm mt-1">Vehicle tracking and status</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KPICard title="Total Vehicles" value={vehicles.length} icon={Truck} color="orchid" />
        <KPICard title="Available" value={available} icon={Truck} color="safe" />
        <KPICard title="In Transit" value={transit} icon={MapPin} color="info" />
        <KPICard title="Avg Fuel" value={avgFuel} suffix="%" icon={Fuel} color={avgFuel > 60 ? 'safe' : 'amber'} />
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-orchid/12 border border-orchid/30 text-orchid-light' : 'bg-white/[0.04] border border-white/[0.08] text-mist-dim hover:bg-orchid/[0.06]'}`}>{f}</button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(v => (
          <GlassCard key={v.id} hover className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold font-mono text-white">{v.id}</span>
              <Badge variant={statusColor(v.status)}>{v.status}</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-mist-muted">Type</span><span className="text-mist">{v.type}</span></div>
              <div className="flex justify-between"><span className="text-mist-muted">Capacity</span><span className="text-mist">{v.capacityTons}T</span></div>
              <div className="flex justify-between"><span className="text-mist-muted">Driver</span><span className="text-mist">{v.driver}</span></div>
              <div className="flex justify-between"><span className="text-mist-muted">State</span><span className="text-mist">{v.state}</span></div>
              <div><span className="text-mist-muted text-xs">Fuel</span><ProgressBar value={v.fuelPct} color={v.fuelPct > 60 ? 'safe' : v.fuelPct > 30 ? 'amber' : 'danger'} showLabel className="mt-1" /></div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
