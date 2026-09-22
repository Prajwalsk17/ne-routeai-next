'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { DispatchMapRoute, DispatchMapIncident } from '@/components/DispatchMap';

const DispatchMap = dynamic(() => import('@/components/DispatchMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] bg-[#0F1714] rounded-xl flex flex-col items-center justify-center border border-white/10 gap-2">
      <div className="ai-spinner" />
      <span className="text-xs text-slate-400">Loading MapLibre Vector Engine...</span>
    </div>
  ),
});
import Badge from '@/components/ui/Badge';
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  Truck,
  MapPin,
  Package,
  Shield,
  Navigation,
  Sparkles,
  RotateCcw,
  Clock,
  Thermometer,
  CloudRain,
  Mountain,
} from 'lucide-react';

interface LocationItem {
  id: string;
  name: string;
  state: string;
  type: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  accessibilityTier: string;
  roadAccessQuality: string;
}

interface VehicleRec {
  vehicle: {
    id: string;
    registrationNumber: string;
    type: string;
    capacityKg: number;
    volumeM3: number;
    terrainCapabilities: string[];
    maxGradientPct: number;
    maxWidthMeters: number;
    status: string;
    driver?: string;
  };
  compatibilityScore: number;
  isRecommended: boolean;
  isEligible: boolean;
  disqualificationReason?: string;
  reasoning: string;
}

interface PlannedRouteData {
  route: {
    coordinates: [number, number][];
    distanceKm: number;
    durationMinutes: number;
    elevationGainMeters: number;
    segments: any[];
  };
  weather: any[];
  riskAssessment: {
    compositeRiskScore: number;
    overallSeverity: string;
    assessmentSummary: string;
  };
}

export default function NewDispatchWizardPage() {
  const router = useRouter();

  // Step Tracker (1 to 7)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [originQuery, setOriginQuery] = useState('Guwahati');
  const [originResults, setOriginResults] = useState<LocationItem[]>([]);
  const [selectedOrigin, setSelectedOrigin] = useState<LocationItem | null>(null);

  const [destQuery, setDestQuery] = useState('Kohima');
  const [destResults, setDestResults] = useState<LocationItem[]>([]);
  const [selectedDest, setSelectedDest] = useState<LocationItem | null>(null);

  const [cargoType, setCargoType] = useState('Medical Vaccines & Emergency Drugs');
  const [cargoWeightKg, setCargoWeightKg] = useState(650);
  const [cargoVolumeM3, setCargoVolumeM3] = useState(2.5);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [requiresColdChain, setRequiresColdChain] = useState(true);

  // Recommendations & Planning
  const [vehicleRecs, setVehicleRecs] = useState<VehicleRec[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRec | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<PlannedRouteData | null>(null);

  // Execution State
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdShipment, setCreatedShipment] = useState<any | null>(null);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Hub Presets
  const QUICK_ORIGINS = ['Guwahati', 'Silchar', 'Tezpur', 'Dibrugarh', 'Shillong'];
  const QUICK_DESTS = ['Kohima', 'Bomdila', 'Tawang', 'Imphal', 'Aizawl', 'Gangtok'];

  // Search Origin
  useEffect(() => {
    if (!originQuery || originQuery.length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(originQuery)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.length > 0) {
            setOriginResults(d.data);
            if (!selectedOrigin) setSelectedOrigin(d.data[0]);
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [originQuery]);

  // Search Destination
  useEffect(() => {
    if (!destQuery || destQuery.length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(destQuery)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data?.length > 0) {
            setDestResults(d.data);
            if (!selectedDest) setSelectedDest(d.data[0]);
          }
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [destQuery]);

  // Trigger Vehicle Recommendations (Step 4)
  const fetchVehicleRecommendations = async () => {
    if (!selectedDest) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/vehicles/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargo_type: cargoType,
          cargo_weight_kg: cargoWeightKg,
          cargo_volume_m3: cargoVolumeM3,
          destination_id: selectedDest.id,
          priority,
          requires_cold_chain: requiresColdChain,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.recommendations) {
        setVehicleRecs(data.data.recommendations);
        const top = data.data.recommendations.find((r: VehicleRec) => r.isRecommended);
        if (top) setSelectedVehicle(top);
      }
    } catch (err) {
      console.error('Vehicle recommendation failed:', err);
      setErrorMsg('Failed to calculate vehicle recommendations');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Route Planning (Step 5)
  const planRoute = async () => {
    if (!selectedOrigin || !selectedDest) return;
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: selectedOrigin.id,
          destination_id: selectedDest.id,
          vehicle_id: selectedVehicle?.vehicle.id,
          avoid_incidents: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPlannedRoute(data.data);
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
      setErrorMsg('Failed to plan road route');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Final Dispatch (Step 7)
  const executeDispatch = async () => {
    if (!selectedOrigin || !selectedDest || !selectedVehicle) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Create Shipment
      const shipRes = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_id: selectedOrigin.id,
          destination_id: selectedDest.id,
          cargo_type: cargoType,
          cargo_weight_kg: cargoWeightKg,
          cargo_volume_m3: cargoVolumeM3,
          priority,
          notes: `Dispatched via Planner. Vehicle: ${selectedVehicle.vehicle.registrationNumber}`,
        }),
      });

      const shipData = await shipRes.json();
      if (!shipData.success) throw new Error(shipData.error?.message || 'Shipment creation failed');
      const shipment = shipData.data;
      setCreatedShipment(shipment);

      // 2. Dispatch Shipment
      const routeId = `route-${selectedOrigin.id}-${selectedDest.id}`;
      const dispatchRes = await fetch('/api/v1/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipment.id,
          vehicle_id: selectedVehicle.vehicle.id,
          driver_id: selectedVehicle.vehicle.driver || 'Tenzing Norbu',
          route_id: routeId,
        }),
      });

      const dispatchData = await dispatchRes.json();
      if (!dispatchData.success) throw new Error(dispatchData.error?.message || 'Dispatch execution failed');
      setDispatchResult(dispatchData.data);
      setCurrentStep(7);
    } catch (err: any) {
      console.error('Dispatch execution failed:', err);
      setErrorMsg(err.message || 'Failed to execute dispatch');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Step Advance
  const handleNext = async () => {
    if (currentStep === 1 && selectedOrigin) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedDest) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      await fetchVehicleRecommendations();
      setCurrentStep(4);
    } else if (currentStep === 4 && selectedVehicle) {
      await planRoute();
      setCurrentStep(5);
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep === 6) {
      await executeDispatch();
    }
  };

  const stepsList = [
    { num: 1, title: 'Origin' },
    { num: 2, title: 'Destination' },
    { num: 3, title: 'Cargo' },
    { num: 4, title: 'Vehicle' },
    { num: 5, title: 'Route Plan' },
    { num: 6, title: 'Risk Scan' },
    { num: 7, title: 'Confirmation' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Navigation className="w-6 h-6 text-purple-400" />
              New Cargo Dispatch Wizard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              End-to-End Northeast Corridor Logistics, Vehicle Matching & Safety Planning
            </p>
          </div>
          <Link
            href="/dispatch"
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-[#1A2E23] transition-colors"
          >
            Cancel & Return
          </Link>
        </div>

        {/* Stepper Breadcrumbs */}
        <div className="grid grid-cols-7 gap-2">
          {stepsList.map((s) => (
            <div
              key={s.num}
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all ${
                currentStep === s.num
                  ? 'bg-purple-950/40 border-purple-500 text-purple-300 font-bold'
                  : currentStep > s.num
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/[0.02] border-white/5 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] mb-1 font-bold">
                {currentStep > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span className="text-[10px] hidden sm:block truncate w-full">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-950/60 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* STEP 1: Select Origin Location */}
      {currentStep === 1 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Step 1: Select Origin Staging Hub</h2>
            <p className="text-xs text-slate-400 mt-0.5">Search location or select a prominent regional staging point.</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={originQuery}
              onChange={(e) => setOriginQuery(e.target.value)}
              placeholder="Search origin city, warehouse, or depot..."
              className="w-full pl-9 pr-4 py-3 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center mr-1">Quick Hubs:</span>
            {QUICK_ORIGINS.map((hub) => (
              <button
                key={hub}
                onClick={() => setOriginQuery(hub)}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/5 transition-colors"
              >
                {hub}
              </button>
            ))}
          </div>

          {originResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {originResults.slice(0, 4).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => setSelectedOrigin(loc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedOrigin?.id === loc.id
                      ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50'
                      : 'bg-[#1A2E23]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{loc.name}</span>
                    <Badge variant="MODERATE">{loc.state}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Elevation: <strong className="text-slate-200">{loc.elevationMeters}m</strong> · Type: {loc.type}</div>
                    <div>Access: <strong className="text-teal-400">{loc.roadAccessQuality}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Select Destination Location */}
      {currentStep === 2 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Step 2: Select Destination Corridor Point</h2>
            <p className="text-xs text-slate-400 mt-0.5">Where is the cargo being delivered across the Northeast?</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Search destination city, outpost, or hospital..."
              className="w-full pl-9 pr-4 py-3 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center mr-1">High-Altitude Hubs:</span>
            {QUICK_DESTS.map((hub) => (
              <button
                key={hub}
                onClick={() => setDestQuery(hub)}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/5 transition-colors"
              >
                {hub}
              </button>
            ))}
          </div>

          {destResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {destResults.slice(0, 4).map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => setSelectedDest(loc)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedDest?.id === loc.id
                      ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50'
                      : 'bg-[#1A2E23]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{loc.name}</span>
                    <Badge variant="MODERATE">{loc.state}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>Elevation: <strong className="text-slate-200">{loc.elevationMeters}m</strong> · Tier: {loc.accessibilityTier}</div>
                    <div>Road Condition: <strong className="text-amber-400">{loc.roadAccessQuality}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Cargo Profile & Requirements */}
      {currentStep === 3 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Step 3: Define Cargo Profile & Requirements</h2>
            <p className="text-xs text-slate-400 mt-0.5">Payload metrics govern vehicle engine, clearance, and gradient matching.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cargo Description</label>
              <input
                type="text"
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH (Urgent Medical/Relief)</option>
                <option value="CRITICAL">CRITICAL (Emergency Response)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Total Weight (kg)</label>
              <input
                type="number"
                value={cargoWeightKg}
                onChange={(e) => setCargoWeightKg(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cargo Volume (m³)</label>
              <input
                type="number"
                step="0.1"
                value={cargoVolumeM3}
                onChange={(e) => setCargoVolumeM3(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[#1A2E23] border border-white/10 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
              <input
                type="checkbox"
                checked={requiresColdChain}
                onChange={(e) => setRequiresColdChain(e.target.checked)}
                className="rounded bg-[#1A2E23] border-white/20 text-purple-600 focus:ring-0"
              />
              <span>Requires Cold-Chain Temperature Control (2°C - 8°C Active Refrigeration)</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 4: Vehicle Recommendation Engine */}
      {currentStep === 4 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Step 4: AI Multi-Constraint Vehicle Recommendation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against road width, gradient limits, terrain capabilities, and cargo constraints.
              </p>
            </div>
            {selectedVehicle && (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/20 px-2.5 py-1 rounded border border-emerald-500/30">
                Top Match Selected
              </span>
            )}
          </div>

          <div className="space-y-3">
            {vehicleRecs.map((rec) => (
              <div
                key={rec.vehicle.id}
                onClick={() => setSelectedVehicle(rec)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedVehicle?.vehicle.id === rec.vehicle.id
                    ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50'
                    : 'bg-[#1A2E23]/60 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-teal-400" />
                    <span className="font-bold text-white text-sm">{rec.vehicle.registrationNumber}</span>
                    <span className="text-xs text-slate-400">({rec.vehicle.type})</span>
                    {rec.isRecommended && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-300">
                      Score: {rec.compatibilityScore}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-2">{rec.reasoning}</p>

                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                  <span>Capacity: {rec.vehicle.capacityKg} kg</span>
                  <span>·</span>
                  <span>Max Gradient: {rec.vehicle.maxGradientPct}%</span>
                  <span>·</span>
                  <span>Width: {rec.vehicle.maxWidthMeters}m</span>
                  <span>·</span>
                  <span>Driver: <strong className="text-slate-200">{rec.vehicle.driver || 'Officer Norbu'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: Route Planning & Weather Analysis */}
      {currentStep === 5 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Step 5: Road Routing & Elevation Analysis</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Turn-by-turn road topology with Open-Meteo meteorological overlay and terrain gradients.
            </p>
          </div>

          {plannedRoute && (
            <>
              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#1A2E23] p-3 rounded-lg border border-white/10">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-teal-400" /> Distance
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {plannedRoute.route?.distanceKm ?? (plannedRoute as any).distanceKm ?? 0} km
                  </div>
                </div>

                <div className="bg-[#1A2E23] p-3 rounded-lg border border-white/10">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-400" /> Duration
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {Math.floor(((plannedRoute.route?.durationMinutes ?? (plannedRoute as any).durationMinutes ?? 0)) / 60)}h{' '}
                    {((plannedRoute.route?.durationMinutes ?? (plannedRoute as any).durationMinutes ?? 0)) % 60}m
                  </div>
                </div>

                <div className="bg-[#1A2E23] p-3 rounded-lg border border-white/10">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-amber-400" /> Elevation Gain
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    +{plannedRoute.route?.elevationGainMeters ?? (plannedRoute as any).elevationGainMeters ?? 0}m
                  </div>
                </div>
              </div>

              {/* Interactive Vector Map */}
              <DispatchMap
                height="380px"
                routes={[
                  {
                    id: 'calculated-route',
                    coordinates: plannedRoute.route?.coordinates ?? (plannedRoute as any).coordinates ?? [],
                    color: '#A855F7',
                    label: `${selectedOrigin?.name || 'Origin'} to ${selectedDest?.name || 'Destination'}`,
                  },
                ]}
              />
            </>
          )}
        </div>
      )}

      {/* STEP 6: Dynamic Risk & Hazard Scanning */}
      {currentStep === 6 && (
        <div className="bg-[#14201A] border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Step 6: Dynamic Risk & Obstacle Safety Scan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Active landslide, flood, and weather monitoring along the planned corridor.
            </p>
          </div>

          {plannedRoute?.riskAssessment && (
            <div className="p-4 rounded-xl border border-white/10 bg-[#1A2E23] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Composite Safety Score</div>
                  <div className="text-2xl font-bold text-white mt-0.5">
                    {100 - plannedRoute.riskAssessment.compositeRiskScore} / 100 Safety Rating
                  </div>
                </div>
                <Badge variant={plannedRoute.riskAssessment.overallSeverity}>
                  {plannedRoute.riskAssessment.overallSeverity} RISK
                </Badge>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {plannedRoute.riskAssessment.assessmentSummary}
              </p>

              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-xs text-slate-400">
                <div>Corridor Status: <strong className="text-emerald-400">Clear for Movement</strong></div>
                <div>Escort Protocol: <strong className="text-slate-200">Standard Transit</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 7: Dispatch Execution Confirmation */}
      {currentStep === 7 && dispatchResult && (
        <div className="bg-[#14201A] border border-emerald-500/40 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Shipment Successfully Dispatched</h2>
            <p className="text-xs text-slate-400 mt-1">
              Driver notification pushed and vehicle binding active in Command Center radar.
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-lg bg-[#1A2E23] border border-white/10 text-xs text-left space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Shipment Code:</span>
              <span className="text-purple-300 font-bold">{dispatchResult.shipmentCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-emerald-400 font-bold">{dispatchResult.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Vehicle:</span>
              <span className="text-slate-200">{dispatchResult.assignedVehicleId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Driver:</span>
              <span className="text-slate-200">{dispatchResult.assignedDriverId}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => router.push('/dispatch')}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
            >
              Open Command Center Radar
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer Controls */}
      {currentStep < 7 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1 || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14201A] hover:bg-[#1A2E23] text-slate-300 text-xs font-medium border border-white/10 disabled:opacity-40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <button
            onClick={handleNext}
            disabled={isProcessing || (currentStep === 1 && !selectedOrigin) || (currentStep === 2 && !selectedDest)}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <span>Calculating...</span>
            ) : currentStep === 6 ? (
              <span>Confirm & Dispatch Shipment</span>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
