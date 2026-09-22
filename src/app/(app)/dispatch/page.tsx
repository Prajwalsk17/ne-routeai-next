'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type {
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
  Phone,
  Search,
  X,
} from 'lucide-react';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-[#0F1714] rounded-xl flex flex-col items-center justify-center border border-white/10 gap-2">
      <div className="ai-spinner" />
      <span className="text-xs text-slate-400">Loading MapLibre Vector Radar...</span>
    </div>
  ),
});

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
  const [safeFacilities, setSafeFacilities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentItem | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [sidePanelTab, setSidePanelTab] = useState<'alerts' | 'safe_havens'>('alerts');
  const [safeHavenSearch, setSafeHavenSearch] = useState('');
  const [safeHavenTypeFilter, setSafeHavenTypeFilter] = useState('ALL');
  const [selectedSafeHaven, setSelectedSafeHaven] = useState<any | null>(null);
  const [activeMapRoutes, setActiveMapRoutes] = useState<DispatchMapRoute[]>([]);
  const [routePlanStatus, setRoutePlanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [routePlanNotice, setRoutePlanNotice] = useState<string | null>(null);
  const [activeRouteMetrics, setActiveRouteMetrics] = useState<{
    distanceKm: number;
    durationMinutes: number;
    originName: string;
    destinationName: string;
  } | null>(null);

  // Fetch all live command center data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [shipmentsRes, alertsRes, incidentsRes, telemetryRes, facilitiesRes] = await Promise.all([
        fetch('/api/v1/shipments').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/alerts').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/incidents?status=ACTIVE').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/telemetry').then((r) => r.json()).catch(() => ({ success: false })),
        fetch('/api/v1/facilities').then((r) => r.json()).catch(() => ({ success: false })),
      ]);

      if (shipmentsRes.success) setShipments(shipmentsRes.data || []);
      if (alertsRes.success) setAlerts(alertsRes.data || []);
      if (incidentsRes.success) setIncidents(incidentsRes.data || []);
      if (telemetryRes.success) setTelemetryList(telemetryRes.data || []);
      if (facilitiesRes.success) setSafeFacilities(facilitiesRes.data?.facilities || []);
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
      // Require real live telemetry coordinates from active assigned vehicle
      const vehicleTelemetry = telemetryList.find((t) => t.vehicleId === shipment.assignedVehicleId);
      const lat = vehicleTelemetry?.coordinates?.lat ?? vehicleTelemetry?.latitude;
      const lng = vehicleTelemetry?.coordinates?.lng ?? vehicleTelemetry?.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        setActionMessage(`Cannot recalculate detour: Live GPS coordinates for vehicle ${shipment.assignedVehicleId || 'unassigned'} are currently unavailable.`);
        setTimeout(() => setActionMessage(null), 5000);
        setIsRecalculating(false);
        return;
      }

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
      } else {
        setActionMessage(`Detour calculation failed: ${data.error?.message || 'Upstream provider error'}`);
        setTimeout(() => setActionMessage(null), 5000);
      }
    } catch (err) {
      console.error('Recalculation error:', err);
      setActionMessage('Failed to trigger emergency recalculation due to network error.');
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Calculate and display the actual road-following transportation route for selected or active shipment
  useEffect(() => {
    const targetShipment =
      selectedShipment ||
      shipments.find((s) => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED' || s.status === 'REROUTING') ||
      shipments[0];

    if (!targetShipment || !targetShipment.originId || !targetShipment.destinationId) {
      setActiveMapRoutes([]);
      setActiveRouteMetrics(null);
      setRoutePlanNotice(null);
      return;
    }

    let isMounted = true;
    setRoutePlanStatus('loading');
    setRoutePlanNotice(null);

    fetch('/api/v1/routes/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_id: targetShipment.originId,
        destination_id: targetShipment.destinationId,
        vehicle_id: targetShipment.assignedVehicleId,
        avoid_incidents: true,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data && data.data.coordinates && data.data.coordinates.length >= 2) {
          const coords: [number, number][] = data.data.coordinates;
          const originLabel = data.data.origin?.name || targetShipment.originId;
          const destLabel = data.data.destination?.name || targetShipment.destinationId;

          const isDetoured = targetShipment.status === 'REROUTING';
          const primaryRoute: DispatchMapRoute = {
            id: data.data.routeId || `route-${targetShipment.id}`,
            coordinates: coords,
            isAlternative: isDetoured,
            color: isDetoured ? '#10B981' : '#A855F7',
            label: isDetoured
              ? `Detour Corridor: ${originLabel} → ${destLabel}`
              : `Planned Road Route: ${originLabel} → ${destLabel}`,
            isGpsTrack: false,
          };

          const routesToDisplay: DispatchMapRoute[] = [primaryRoute];

          // If assigned vehicle has real GPS positions, render distinct GPS track if history exists
          const vehicleTelemetry = telemetryList.find((t) => t.vehicleId === targetShipment.assignedVehicleId);
          if (
            vehicleTelemetry?.breadcrumbHistory &&
            Array.isArray(vehicleTelemetry.breadcrumbHistory) &&
            vehicleTelemetry.breadcrumbHistory.length >= 2
          ) {
            const trackCoords: [number, number][] = vehicleTelemetry.breadcrumbHistory.map((b: any) => [
              b.lng ?? b.longitude,
              b.lat ?? b.latitude,
            ]);
            routesToDisplay.push({
              id: `gps-track-${targetShipment.id}`,
              coordinates: trackCoords,
              isGpsTrack: true,
              color: '#06B6D4',
              label: `Actual GPS Track (${targetShipment.assignedVehicleId})`,
            });
          }

          setActiveMapRoutes(routesToDisplay);
          setActiveRouteMetrics({
            distanceKm: data.data.distanceKm,
            durationMinutes: data.data.durationMinutes,
            originName: originLabel,
            destinationName: destLabel,
          });
          setRoutePlanStatus('success');
        } else {
          setActiveMapRoutes([]);
          setActiveRouteMetrics(null);
          setRoutePlanStatus('error');
          setRoutePlanNotice(data.error?.message || 'Route unavailable between origin and destination');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setActiveMapRoutes([]);
        setActiveRouteMetrics(null);
        setRoutePlanStatus('error');
        setRoutePlanNotice('Routing service temporarily unavailable');
      });

    return () => {
      isMounted = false;
    };
  }, [selectedShipment, shipments, telemetryList]);

  // Real-Time Fleet Telemetry (Strict Zero-Fabrication)
  const mapVehicles: DispatchMapVehicle[] = [];
  telemetryList.forEach((t) => {
    const pos = t.latestPosition || (t.coordinates ? t : null);
    if (pos && pos.coordinates && typeof pos.coordinates.lat === 'number') {
      mapVehicles.push({
        id: t.vehicleId || pos.vehicleId || 'veh-active',
        label: t.registrationNumber || t.vehicleId || 'Active Vehicle',
        coordinates: { lat: pos.coordinates.lat, lng: pos.coordinates.lng },
        speedKmh: typeof pos.speedKmh === 'number' ? pos.speedKmh : 0,
        headingDegrees: typeof pos.headingDegrees === 'number' ? pos.headingDegrees : 0,
        status: t.tripId ? 'IN_TRANSIT' : 'ACTIVE',
        freshnessStatus: t.freshness || 'LIVE',
        accuracyMeters: pos.accuracyMeters || undefined,
        lastHeartbeat: t.lastHeartbeatAt || pos.recordedAt || pos.timestamp,
      });
    }
  });

  const mapIncidents: DispatchMapIncident[] = incidents.map((inc) => ({
    id: inc.id,
    title: inc.title,
    type: inc.type,
    severity: inc.severity,
    coordinates: inc.coordinates,
    affectedRadiusMeters: inc.affectedRadiusMeters || 1000,
  }));

  const mapSafeLocations: DispatchMapSafeLocation[] = safeFacilities
    .filter(
      (f) =>
        f.coordinates &&
        typeof f.coordinates.lat === 'number' &&
        typeof f.coordinates.lng === 'number' &&
        !isNaN(f.coordinates.lat) &&
        !isNaN(f.coordinates.lng)
    )
    .map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type || 'RELIEF_CAMP',
      coordinates: f.coordinates,
      distanceKm: typeof f.distanceKm === 'number' ? f.distanceKm : undefined,
    }));

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

        <button
          onClick={() => setSidePanelTab('safe_havens')}
          className="bg-[#14201A] border border-white/10 rounded-xl p-4 flex flex-col justify-between text-left hover:border-emerald-500/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium w-full">
            <span>Safe Havens Online</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{safeFacilities.length}</span>
            <span className="text-xs text-emerald-400/80">police/hospital</span>
          </div>
        </button>
      </div>

      {/* Main Map & Incident Alert Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware-Accelerated Interactive Map (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-purple-400" />
              Live Corridor Radar & Road Topology
            </h2>
            <div className="flex items-center gap-2">
              {routePlanStatus === 'loading' && (
                <span className="text-[11px] text-purple-300 animate-pulse">Calculating road network route...</span>
              )}
              {routePlanStatus === 'error' && (
                <span className="text-[11px] text-amber-400 font-medium">
                  {routePlanNotice || 'Route unavailable'}
                </span>
              )}
              {activeRouteMetrics && routePlanStatus === 'success' && (
                <span className="text-[11px] text-slate-300 font-mono">
                  {activeRouteMetrics.distanceKm} km · {Math.floor(activeRouteMetrics.durationMinutes / 60)}h{' '}
                  {activeRouteMetrics.durationMinutes % 60}m
                </span>
              )}
              <span className="text-[11px] text-slate-500 hidden sm:inline">MapLibre GL Vector Engine</span>
            </div>
          </div>

          <DispatchMap
            height="520px"
            routes={activeMapRoutes}
            vehicles={mapVehicles}
            incidents={mapIncidents}
            safeLocations={mapSafeLocations}
            selectedVehicleId={selectedShipment?.assignedVehicleId}
            selectedSafeLocationId={selectedSafeHaven?.id}
            onSafeLocationClick={(safeId) => {
              const found = safeFacilities.find((f) => f.id === safeId);
              if (found) {
                setSelectedSafeHaven(found);
                setSidePanelTab('safe_havens');
              }
            }}
          />
        </div>

        {/* Real-Time Alert & Safe Haven Split Panel (1 col) */}
        <div className="space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-[#1A2E23] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setSidePanelTab('alerts')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                  sidePanelTab === 'alerts'
                    ? 'bg-red-600/30 text-red-300 border border-red-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Alerts ({alerts.length})
              </button>
              <button
                onClick={() => setSidePanelTab('safe_havens')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all ${
                  sidePanelTab === 'safe_havens'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Safe Havens ({safeFacilities.length})
              </button>
            </div>
            <span className="text-[11px] text-slate-400">
              {sidePanelTab === 'alerts' ? `${alerts.length} events` : `${safeFacilities.length} hubs`}
            </span>
          </div>

          <div className="flex-1 bg-[#14201A] border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[520px] space-y-3">
            {sidePanelTab === 'alerts' ? (
              alerts.length === 0 ? (
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
              )
            ) : (
              /* Safe Havens Function */
              <div className="space-y-3">
                {/* Search & Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search havens by name or state..."
                      value={safeHavenSearch}
                      onChange={(e) => setSafeHavenSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#1A2E23] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    {['ALL', 'POLICE_POST', 'HOSPITAL', 'RELIEF_CAMP', 'WAREHOUSE'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSafeHavenTypeFilter(t)}
                        className={`px-2 py-0.5 rounded whitespace-nowrap font-medium transition-all ${
                          safeHavenTypeFilter === t
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 'ALL' ? 'All' : t.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Safe Haven Details Card */}
                {selectedSafeHaven && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs space-y-2.5 animate-in fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">{selectedSafeHaven.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                            {selectedSafeHaven.type}
                          </span>
                        </div>
                        {selectedSafeHaven.state && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{selectedSafeHaven.state}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedSafeHaven(null)}
                        className="text-slate-400 hover:text-white p-1"
                        title="Close details"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-500/20">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Coordinates</span>
                        {selectedSafeHaven.coordinates &&
                        typeof selectedSafeHaven.coordinates.lat === 'number' &&
                        typeof selectedSafeHaven.coordinates.lng === 'number' &&
                        !isNaN(selectedSafeHaven.coordinates.lat) &&
                        !isNaN(selectedSafeHaven.coordinates.lng) ? (
                          <span className="font-mono text-emerald-300 font-semibold">
                            {selectedSafeHaven.coordinates.lat.toFixed(4)}° N, {selectedSafeHaven.coordinates.lng.toFixed(4)}° E
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Verified location unavailable.</span>
                        )}
                      </div>
                      {selectedSafeHaven.status && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Operating Status</span>
                          <span className="text-slate-200 font-medium">{selectedSafeHaven.status}</span>
                        </div>
                      )}
                      {(selectedSafeHaven.capacityDescription || selectedSafeHaven.capacityTons) && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">Capacity & Resources</span>
                          <span className="text-slate-300 leading-snug">
                            {selectedSafeHaven.capacityDescription || `${selectedSafeHaven.capacityTons} tons staging load`}
                          </span>
                        </div>
                      )}
                      {selectedSafeHaven.distanceKm !== undefined && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Distance</span>
                          <span className="text-slate-200 font-medium">{selectedSafeHaven.distanceKm} km</span>
                        </div>
                      )}
                      {selectedSafeHaven.contactNumber && (
                        <div>
                          <span className="text-slate-400 block text-[10px]">Contact</span>
                          <a
                            href={`tel:${selectedSafeHaven.contactNumber}`}
                            className="text-emerald-400 hover:underline font-mono inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {selectedSafeHaven.contactNumber}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Haven List */}
                {isLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading verified safe havens...</div>
                ) : safeFacilities.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    <Shield className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                    No verified safe havens available.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeFacilities
                      .filter((sh) => {
                        const q = safeHavenSearch.toLowerCase().trim();
                        const matchesSearch =
                          !q ||
                          sh.name?.toLowerCase().includes(q) ||
                          sh.state?.toLowerCase().includes(q);
                        const matchesType = safeHavenTypeFilter === 'ALL' || sh.type === safeHavenTypeFilter;
                        return matchesSearch && matchesType;
                      })
                      .map((sh) => {
                        const isSelected = selectedSafeHaven?.id === sh.id;
                        const hasCoords =
                          sh.coordinates &&
                          typeof sh.coordinates.lat === 'number' &&
                          typeof sh.coordinates.lng === 'number' &&
                          !isNaN(sh.coordinates.lat) &&
                          !isNaN(sh.coordinates.lng);
                        return (
                          <div
                            key={sh.id}
                            onClick={() => setSelectedSafeHaven(sh)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md'
                                : 'bg-[#1A2E23] border-white/10 hover:border-emerald-500/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-200">{sh.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                                {sh.type}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                              <span>{sh.state || 'Northeast Corridor'}</span>
                              {hasCoords ? (
                                <span className="text-emerald-400 text-[10px]">Verified GPS</span>
                              ) : (
                                <span className="text-amber-400 text-[10px]">Verified location unavailable</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
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
