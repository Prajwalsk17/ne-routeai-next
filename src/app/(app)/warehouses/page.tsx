'use client';
import { useEffect, useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { Warehouse as WarehouseIcon, AlertTriangle } from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/v1/facilities')
      .then((r) => r.json())
      .then((res) => {
        setWarehouses(res.data?.facilities || res.facilities || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => (s === 'OPERATIONAL' ? 'LOW' : s === 'NEAR_CAPACITY' ? 'HIGH' : 'CRITICAL');
  const invColor = (l: string) => (l === 'HIGH' ? 'safe' : l === 'MEDIUM' ? 'amber' : 'danger');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
          <WarehouseIcon size={28} className="text-teal" /> Warehouse Intelligence
        </h1>
        <p className="text-mist-muted text-sm mt-1">Hub capacity &amp; inventory monitoring</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="ai-spinner" />
        </div>
      ) : warehouses.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <WarehouseIcon size={32} className="mx-auto text-mist-muted mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Warehouses Found</h3>
          <p className="text-xs text-mist-dim">
            No regional warehouse facilities or staging hubs recorded for this jurisdiction.
          </p>
        </GlassCard>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((w) => (
            <GlassCard key={w.id} hover className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">{w.name}</h3>
                <Badge variant={statusColor(w.status)}>{w.status}</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-mist-muted">State</span>
                  <span className="text-mist">{w.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mist-muted">Max Capacity</span>
                  <span className="text-mist">{w.capacityTons}T</span>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-mist-muted">Load</span>
                    <span className="text-white font-mono">{w.currentLoadPct}%</span>
                  </div>
                  <ProgressBar
                    value={w.currentLoadPct}
                    color={w.currentLoadPct > 80 ? 'danger' : w.currentLoadPct > 60 ? 'amber' : 'safe'}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-mist-muted">Inventory</span>
                  <Badge variant={invColor(w.inventoryLevel) as any}>{w.inventoryLevel}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-mist-muted">Risk Score</span>
                  <span className={`font-mono text-sm ${w.riskScore > 60 ? 'text-danger' : 'text-mist'}`}>
                    {w.riskScore}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mist-muted">Access Score</span>
                  <span className="font-mono text-sm text-mist">{w.accessibilityScore}/100</span>
                </div>
              </div>
              {w.riskScore > 60 && (
                <div className="mt-3 p-2 rounded bg-danger/[0.06] border border-danger/20 flex items-center gap-2 text-xs text-danger-light">
                  <AlertTriangle size={14} /> Elevated risk zone
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
