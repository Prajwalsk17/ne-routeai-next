'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import DispatchMap, {
  DispatchMapRoute,
  DispatchMapVehicle,
  DispatchMapIncident,
  DispatchMapSafeLocation,
} from '@/components/DispatchMap';
import Badge from '@/components/ui/Badge';
import {
  Truck,
  AlertTriangle,
  Shield,
  Navigation,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Radio,
  Activity,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface ShipmentItem {
  id: string;
  shipmentCode: string;
  originId: string;
  destinationId: string;
  cargoType: string;
  cargoWeightKg: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  assignedVehicleId?: string;
  assignedDriverId?: string;
  activeRouteId?: string;
  dispatchedAt?: string;
  updatedAt: string;
}

interface AlertItem {
  id: string;
  alertCode: string;
  shipmentId?: string;
  vehicleId?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  distanceToHazardKm?: number;
  status: string;
  createdAt: string;
}

interface IncidentItem {
  id: string;
  code: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  locationName?: string;
  coordinates: { lat: number; lng: number };
  affectedRadiusMeters?: number;
  status: string;
}

export default function DispatchCommandCenterPage() {
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [telemetryList, setTelemetryList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Fetch all live command center data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [shipmentsRes, alertsRes, incidentsRes, telemetryRes] = await Promise.all([
        fetch('/api/v1/shipments').then((r) => r.json()),
        fetch('/api/v1/alerts').then((r) => r.json()),
        fetch('/api/v1/incidents?status=ACTIVE').then((r) => r.json()),
        fetch('/api/v1/telemetry').then((r) => r.json()),
      ]);

      if (shipmentsRes.success) setShipments(shipmentsRes.data || []);
      if (alertsRes.success) setAlerts(alertsRes.data || []);
      if (incidentsRes.success) setIncidents(incidentsRes.data || []);
      if (telemetryRes.success) setTelemetryList(telemetryRes.data || []);
    } catch (err) {
      console.error('Failed to load dispatch telemetry & shipments:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Live radar poll every 4 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Alert Acknowledgment / Escalation
  const handleAlertAction = async (alertId: string, action: 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE') => {
    try {
      const res = await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alertId,
          action,
          notes: `Dispatcher action ${action} executed from Command Center`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Alert ${action} confirmed`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update alert:', err);
    }
  };

  // Trigger Emergency Route Recalculation
  const handleEmergencyRecalculate = async (shipment: ShipmentItem) => {
    try {
      setIsRecalculating(true);
      // Use current telemetry coords or Guwahati-Tezpur midpoint default
      const vehicleTelemetry = telemetryList.find((t) => t.vehicleId === shipment.assignedVehicleId);
      const lat = vehicleTelemetry?.coordinates?.lat || 26.35;
      const lng = vehicleTelemetry?.coordinates?.lng || 92.4;

      const res = await fetch('/api/v1/routes/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipment.id,
          current_lat: lat,
          current_lng: lng,
          reason: 'Dispatcher triggered emergency detour around monitored hazard blockage',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionMessage(`Shipment ${shipment.shipmentCode} rerouted successfully. Driver notified.`);
        setTimeout(() => setActionMessage(null), 5000);
        fetchData();
      }
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Build Map Elements
  const mapRoutes: DispatchMapRoute[] = [
    // Guwahati to Kohima via NH-29
    {
      id: 'primary-nh29',
      coordinates: [
        [91.7362, 26.1445], // Guwahati
        [92.1500, 26.2500],
        [92.8004, 26.6338], // Tezpur
        [93.7258, 25.9069], // Dimapur
        [94.1077, 25.6701], // Kohima
      ],
      color: '#A855F7',
      label: 'Primary Route NH-29',
    },
    // Alternate Detour Route
    {
      id: 'detour-bypass',
      coordinates: [
        [93.7258, 25.9069], // Dimapur
        [93.9500, 25.8000], // Bypass ridge
        [94.1077, 25.6701], // Kohima
      ],
      isAlternative: true,
      color: '#10B981',
      label: 'Zubza Bypass Detour',
    },
  ];

  const mapVehicles: DispatchMapVehicle[] = [
    {
      id: 'v-01',
      label: 'AS-01-AX-1010 (4x4)',
      coordinates: { lat: 25.82, lng: 93.85 },
      speedKmh: 42,
      headingDegrees: 115,
      status: 'IN_TRANSIT',
    },
    {
      id: 'v-02',
      label: 'AS-01-BX-2020 (Light Van)',
      coordinates: { lat: 26.45, lng: 92.55 },
      speedKmh: 58,
      headingDegrees: 70,
      status: 'DISPATCHED',
    },
  ];

  const mapIncidents: DispatchMapIncident[] = incidents.map((inc) => ({
    id: inc.id,
    title: inc.title,
    type: inc.type,
    severity: inc.severity,
    coordinates: inc.coordinates,
    affectedRadiusMeters: inc.affectedRadiusMeters || 1000,
  }));

  const mapSafeLocations: DispatchMapSafeLocation[] = [
    { id: 's-1', name: 'Dimapur Highway Police Station', type: 'POLICE_POST', coordinates: { lat: 25.912, lng: 93.731 }, distanceKm: 8.5 },
    { id: 's-2', name: 'Maram Relief Staging Base', type: 'RELIEF_CAMP', coordinates: { lat: 25.185, lng: 94.015 }, distanceKm: 24.0 },
    { id: 's-3', name: 'Kohima District Hospital', type: 'HOSPITAL', coordinates: { lat: 25.665, lng: 94.105 }, distanceKm: 18.2 },
  ];

  const activeDispatchesCount = shipments.filter(
    (s) => s.status === 'DISPATCHED' || s.status === 'IN_TRANSIT' || s.status === 'REROUTING'
  ).length;

  const criticalAlertsCount = alerts.filter(
    (a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED' && a.status !== 'DISMISSED'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Operational Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#14201A]/80 border border-white/10 rounded-xl p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Dispatch Command Center</h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE TELEMETRY
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Northeast Corridor Dynamic Route Monitoring, Real-Time Hazard Alerting & Fleet Control
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A2E23] hover:bg-[#233F30] text-slate-300 text-xs font-medium border border-white/10 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-400' : ''}`} />
            Refresh
          </button>

          <Link
            href="/dispatch/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Dispatch Plan
          </Link>
        </div>
      </div>

      {/* Confirmation notification banner */}
      {actionMessage && (
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-lg text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {actionMessage}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active En Route</span>
            <Truck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{activeDispatchesCount}</span>
            <span className="text-xs text-slate-500">of {shipments.length} total</span>
          </div>
        </div>

        <div className="bg-[#14201A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Hazards</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{incidents.length}</span>
            <span className="text-xs text-amber-400/80">monitored sectors</span>
          </div>
        </div>

        <div className="bg-[#14201A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical Alerts</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{criticalAlertsCount}</span>
            <span className="text-xs text-red-400/80">requires triage</span>
          </div>
        </div>

        <div className="bg-[#14201A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Safe Havens Online</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">6</span>
            <span className="text-xs text-emerald-400/80">police/hospital</span>
          </div>
        </div>
      </div>

      {/* Main Map & Incident Alert Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware-Accelerated Interactive Map (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-400" />
              Live Corridor Radar & Route Topology
            </h2>
            <span className="text-[11px] text-slate-400">MapLibre GL Vector Engine</span>
          </div>

          <DispatchMap
            height="520px"
            routes={mapRoutes}
            vehicles={mapVehicles}
            incidents={mapIncidents}
            safeLocations={mapSafeLocations}
            selectedVehicleId={selectedShipment?.assignedVehicleId}
          />
        </div>

        {/* Real-Time Alert Triage Center (1 col) */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400" />
              Emergency Safety Alert Feed
            </h2>
            <span className="text-[11px] text-slate-400">{alerts.length} events</span>
          </div>

          <div className="flex-1 bg-[#14201A] border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[520px] space-y-3">
            {alerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Shield className="w-8 h-8 mb-2 text-emerald-500/40" />
                <p className="text-xs">No active emergency alerts.</p>
                <p className="text-[11px] text-slate-600 mt-1">All monitored corridors operational.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-950/30 border-red-500/40'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : 'bg-[#1A2E23] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="text-amber-400 font-mono text-[10px]">{alert.alertCode}</span>
                      {alert.title}
                    </span>
                    <Badge variant={alert.severity}>{alert.severity}</Badge>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] text-slate-500">
                    <span>Status: <strong className="text-slate-300">{alert.status}</strong></span>
                    {alert.distanceToHazardKm && (
                      <span>{alert.distanceToHazardKm} km ahead</span>
                    )}
                  </div>

                  {/* Dispatcher Triage Actions */}
                  {alert.status !== 'RESOLVED' && (
                    <div className="flex items-center gap-2 pt-1">
                      {alert.status !== 'ACKNOWLEDGED' && (
                        <button
                          onClick={() => handleAlertAction(alert.id, 'ACKNOWLEDGE')}
                          className="flex-1 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-medium border border-purple-500/30 transition-colors text-[10px]"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleAlertAction(alert.id, 'ESCALATE')}
                        className="flex-1 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 font-medium border border-red-500/30 transition-colors text-[10px]"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, 'RESOLVE')}
                        className="flex-1 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-medium border border-emerald-500/30 transition-colors text-[10px]"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Shipments & Dispatch Execution Table */}
      <div className="bg-[#14201A] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Active Cargo Dispatches</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live transit lifecycle status, assigned vehicles, drivers, and dynamic detour controls
            </p>
          </div>
          <span className="text-xs text-slate-500">{shipments.length} tracked records</span>
        </div>

        {shipments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Truck className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            No shipments registered yet. Click &quot;New Dispatch Plan&quot; to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Shipment</th>
                  <th className="py-3 px-3">Route Sector</th>
                  <th className="py-3 px-3">Cargo Details</th>
                  <th className="py-3 px-3">Vehicle & Driver</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Emergency Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shipments.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedShipment(s)}
                    className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${
                      selectedShipment?.id === s.id ? 'bg-purple-950/20 border-l-2 border-purple-500' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-purple-300">
                      {s.shipmentCode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span>{s.originId}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span>{s.destinationId}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200 font-medium">{s.cargoType}</div>
                      <div className="text-[10px] text-slate-500">{s.cargoWeightKg} kg · {s.priority}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-300 font-medium">{s.assignedVehicleId || 'Unassigned'}</div>
                      <div className="text-[10px] text-slate-500">{s.assignedDriverId || 'No driver'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={s.status === 'REROUTING' ? 'HIGH' : s.status === 'IN_TRANSIT' ? 'success' : 'ADVISORY'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmergencyRecalculate(s);
                        }}
                        disabled={isRecalculating}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium border border-amber-500/30 transition-colors text-[11px]"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRecalculating ? 'animate-spin' : ''}`} />
                        Reroute Detour
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
