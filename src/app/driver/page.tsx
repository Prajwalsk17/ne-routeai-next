'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DispatchMap, { DispatchMapRoute, DispatchMapVehicle, DispatchMapIncident, DispatchMapSafeLocation } from '@/components/DispatchMap';
import Badge from '@/components/ui/Badge';
import {
  Navigation,
  AlertTriangle,
  Shield,
  Radio,
  RotateCcw,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ArrowUp,
  Volume2,
  VolumeX,
  Phone,
  Eye,
  AlertOctagon,
  Play,
  Pause,
} from 'lucide-react';

interface SafeHaven {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  contactNumber: string;
  coordinates: { lat: number; lng: number };
}

// Simulated GPS path along NH-29 Dimapur-Kohima mountain corridor
const SIMULATION_POINTS = [
  { lat: 25.8600, lng: 93.7500, speed: 45, heading: 110, altitude: 480, sector: 'NH-29 Lower Valley Foothills' },
  { lat: 25.8000, lng: 93.8300, speed: 40, heading: 115, altitude: 720, sector: 'NH-29 Medziphema Ascending Ridge' },
  { lat: 25.7500, lng: 93.9200, speed: 32, heading: 120, altitude: 980, sector: 'NH-29 Piphema Winding Pass' },
  { lat: 25.7200, lng: 94.0100, speed: 25, heading: 125, altitude: 1240, sector: 'NH-29 Approaching Zubza Sector' }, // Near hazard!
  { lat: 25.7100, lng: 94.0280, speed: 0, heading: 130, altitude: 1310, sector: 'NH-29 Zubza Landslide Obstacle' }, // Hazard sector
];

export default function DriverNavigationPage() {
  const [isMuted, setIsMuted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  // Driver & Vehicle State
  const [driverName] = useState('Officer Tenzing Norbu');
  const [vehicleReg] = useState('AS-01-AX-1010 (Utility 4x4)');
  const [shipmentCode, setShipmentCode] = useState('SHP-1048');

  // GPS Telemetry State
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: 25.8000,
    lng: 93.8300,
  });
  const [currentSpeed, setCurrentSpeed] = useState(40);
  const [currentHeading, setCurrentHeading] = useState(115);
  const [currentAltitude, setCurrentAltitude] = useState(720);
  const [currentSector, setCurrentSector] = useState('NH-29 Medziphema Ascending Ridge');

  // Hazards & Alerts State
  const [hazardWarning, setHazardWarning] = useState<any | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isDetoured, setIsDetoured] = useState(false);
  const [recalcSummary, setRecalcSummary] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [safeHavensOpen, setSafeHavensOpen] = useState(false);

  // Safe Havens List
  const [safeHavens] = useState<SafeHaven[]>([
    {
      id: 'sh-1',
      name: 'Dimapur Highway Security Station',
      type: 'POLICE_POST',
      distanceKm: 4.8,
      contactNumber: '+91-3862-230100',
      coordinates: { lat: 25.912, lng: 93.731 },
    },
    {
      id: 'sh-2',
      name: 'Zubza Community Emergency Clinic',
      type: 'HOSPITAL',
      distanceKm: 3.2,
      contactNumber: '+91-370-224410',
      coordinates: { lat: 25.715, lng: 94.025 },
    },
    {
      id: 'sh-3',
      name: 'Maram Relief Camp & Shelter',
      type: 'RELIEF_CAMP',
      distanceKm: 18.5,
      contactNumber: '+91-3871-222333',
      coordinates: { lat: 25.185, lng: 94.015 },
    },
  ]);

  // Send GPS Telemetry Ping to Server
  const transmitTelemetry = useCallback(async (coords: { lat: number; lng: number }, speed: number, heading: number, altitude: number) => {
    try {
      await fetch('/api/v1/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: 'c0000000-0000-0000-0000-000000000001',
          shipment_id: 'shp-active-01',
          latitude: coords.lat,
          longitude: coords.lng,
          speed_kmh: speed,
          heading_degrees: heading,
          altitude_meters: altitude,
          accuracy_meters: 4.5,
        }),
      });
    } catch {
      // Background ping error handled silently
    }
  }, []);

  // Distance calculation helper
  const getDistanceKm = (c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
    const R = 6371;
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1.lat * Math.PI) / 180) *
        Math.cos((c2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  };

  // Check Advance Hazard Proximity
  useEffect(() => {
    const hazardLocation = { lat: 25.7120, lng: 94.0320 }; // Zubza Landslide
    const dist = getDistanceKm(currentCoords, hazardLocation);

    if (dist <= 5.0 && !isDetoured) {
      setHazardWarning({
        title: 'CRITICAL HAZARD DETECTED AHEAD',
        type: 'LANDSLIDE',
        severity: 'CRITICAL',
        distanceKm: dist,
        locationName: 'NH-29 Zubza Mountain Pass',
        message: `Active rockslide blocking both carriageways ${dist} km ahead. Road impassable for heavy transport.`,
      });
    } else if (isDetoured) {
      setHazardWarning(null);
    }
  }, [currentCoords, isDetoured]);

  // URL query params binding (from dispatch action)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('shipmentId');
      if (sid) {
        setShipmentCode(sid.startsWith('SHP-') ? sid : `SHP-${sid.slice(0, 6).toUpperCase()}`);
      }
      if (params.get('simulate') === 'true') {
        setIsSimulating(true);
      }
    }
  }, []);

  // Simulation step timer (2.5s interval for smooth real-time visualization)
  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setSimIndex((prev) => {
        const next = (prev + 1) % SIMULATION_POINTS.length;
        const pt = SIMULATION_POINTS[next];
        setCurrentCoords({ lat: pt.lat, lng: pt.lng });
        setCurrentSpeed(pt.speed);
        setCurrentHeading(pt.heading);
        setCurrentAltitude(pt.altitude);
        setCurrentSector(pt.sector);
        transmitTelemetry({ lat: pt.lat, lng: pt.lng }, pt.speed, pt.heading, pt.altitude);
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isSimulating, transmitTelemetry]);

  // Execute Dynamic Route Recalculation
  const handleRecalculateDetour = async () => {
    setIsRecalculating(true);
    try {
      const res = await fetch('/api/v1/routes/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: 'shp-active-01',
          current_lat: currentCoords.lat,
          current_lng: currentCoords.lng,
          reason: 'Driver initiated detour due to active Zubza landslide blockage',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsDetoured(true);
        setHazardWarning(null);
        setRecalcSummary(
          `Detour assigned via Western Ridge bypass (+18 min, safe terrain). Dispatched to route controller.`
        );
      }
    } catch (err) {
      console.error('Failed to trigger detour:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Build Map Route & Vehicle Elements
  const mapRoutes: DispatchMapRoute[] = [
    {
      id: 'driver-route',
      coordinates: isDetoured
        ? [
            [currentCoords.lng, currentCoords.lat],
            [93.9500, 25.8000],
            [94.1077, 25.6701], // Kohima
          ]
        : [
            [currentCoords.lng, currentCoords.lat],
            [93.9200, 25.7500],
            [94.0280, 25.7100], // Hazard
            [94.1077, 25.6701],
          ],
      isAlternative: isDetoured,
      isBlocked: !isDetoured && !!hazardWarning,
      color: isDetoured ? '#10B981' : hazardWarning ? '#EF4444' : '#A855F7',
      label: isDetoured ? 'Active Detour Route' : 'Primary Route NH-29',
    },
  ];

  const mapVehicles: DispatchMapVehicle[] = [
    {
      id: 'driver-vehicle',
      label: 'Your Vehicle (4x4)',
      coordinates: currentCoords,
      speedKmh: currentSpeed,
      headingDegrees: currentHeading,
      status: 'IN_TRANSIT',
    },
  ];

  const mapIncidents: DispatchMapIncident[] = [
    {
      id: 'inc-zubza',
      title: 'Zubza Landslide Blockage',
      type: 'LANDSLIDE',
      severity: 'CRITICAL',
      coordinates: { lat: 25.7120, lng: 94.0320 },
      affectedRadiusMeters: 1200,
    },
  ];

  const mapSafeLocations: DispatchMapSafeLocation[] = safeHavens.map((sh) => ({
    id: sh.id,
    name: sh.name,
    type: sh.type,
    coordinates: sh.coordinates,
    distanceKm: sh.distanceKm,
  }));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0F1714] text-white flex flex-col justify-between border-x border-white/10 shadow-2xl">
      {/* Top Mobile Nav Header */}
      <div className="bg-[#14201A] border-b border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
              GPS ONLINE · 4G LTE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-md bg-white/5 border border-white/10 text-slate-300"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <Link
              href="/dispatch"
              className="text-[11px] text-slate-400 px-2 py-1 rounded bg-white/5 border border-white/10"
            >
              Exit
            </Link>
          </div>
        </div>

        {/* Driver & Shipment ID */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-white text-sm">{driverName}</div>
            <div className="text-[11px] text-slate-400 font-mono">{vehicleReg}</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-purple-300 text-xs">{shipmentCode}</div>
            <Badge variant="success">IN TRANSIT</Badge>
          </div>
        </div>

        {/* Turn-by-Turn Instruction Banner */}
        <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-600/30 border border-purple-500/50 flex items-center justify-center shrink-0">
            <ArrowUp className="w-6 h-6 text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">
              {isDetoured ? 'Follow Western Ridge Bypass' : 'Continue on NH-29 Highway'}
            </div>
            <div className="text-[11px] text-purple-200/80 truncate mt-0.5">{currentSector}</div>
          </div>
        </div>
      </div>

      {/* Emergency Hazard Warning Alert Banner (<5km proximity) */}
      {hazardWarning && (
        <div className="bg-red-950/90 border-y-2 border-red-500 p-4 space-y-3 animate-pulse">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <div className="font-bold text-red-200 text-sm">{hazardWarning.title}</div>
              <p className="text-xs text-red-300/90 leading-relaxed mt-1">
                {hazardWarning.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleRecalculateDetour}
              disabled={isRecalculating}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/40 flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              Recalculate Safe Detour
            </button>
            <button
              onClick={() => setSafeHavensOpen(true)}
              className="px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20"
            >
              Safe Havens
            </button>
          </div>
        </div>
      )}

      {/* Recalculation Confirmation Banner */}
      {recalcSummary && (
        <div className="bg-emerald-950/80 border-y border-emerald-500/50 p-3 flex items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{recalcSummary}</span>
        </div>
      )}

      {/* Interactive Map Section */}
      <div className="flex-1 relative min-h-[360px]">
        <DispatchMap
          height="100%"
          routes={mapRoutes}
          vehicles={mapVehicles}
          incidents={mapIncidents}
          safeLocations={mapSafeLocations}
          showLayerControls={false}
          initialZoom={11}
          initialCenter={[currentCoords.lng, currentCoords.lat]}
        />

        {/* Speedometer & Altitude HUD Overlay */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <div className="bg-[#14201A]/90 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10 shadow-lg text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Speed</div>
            <div className="text-xl font-black font-mono text-teal-300">{currentSpeed} <span className="text-[10px] font-normal text-slate-400">km/h</span></div>
          </div>
          <div className="bg-[#14201A]/90 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10 shadow-lg text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Altitude</div>
            <div className="text-xl font-black font-mono text-purple-300">{currentAltitude} <span className="text-[10px] font-normal text-slate-400">m</span></div>
          </div>
        </div>

        {/* Simulation Play/Pause Overlay */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border backdrop-blur-md shadow-lg transition-all ${
              isSimulating
                ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                : 'bg-[#14201A]/90 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isSimulating ? 'Pause Route' : 'Simulate Drive'}
          </button>
        </div>
      </div>

      {/* Safe Havens Drawer Modal */}
      {safeHavensOpen && (
        <div className="bg-[#14201A] border-t border-white/20 p-4 space-y-3 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> Nearest Emergency Safe Havens
            </h3>
            <button
              onClick={() => setSafeHavensOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {safeHavens.map((sh) => (
              <div
                key={sh.id}
                className="p-2.5 rounded-lg bg-[#1A2E23] border border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">{sh.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {sh.distanceKm} km away · {sh.type}
                  </div>
                </div>
                <a
                  href={`tel:${sh.contactNumber}`}
                  className="p-2 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Emergency & Reporting Toolbar */}
      <div className="bg-[#14201A] border-t border-white/10 p-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => setSafeHavensOpen(!safeHavensOpen)}
          className="py-3 rounded-xl bg-[#1A2E23] hover:bg-[#233F30] text-slate-200 text-xs font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors"
        >
          <Shield className="w-4 h-4 text-emerald-400" />
          Safe Havens
        </button>

        <button
          onClick={handleRecalculateDetour}
          disabled={isRecalculating}
          className="py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold border border-purple-500/30 flex items-center justify-center gap-2 transition-colors"
        >
          <RotateCcw className={`w-4 h-4 text-purple-400 ${isRecalculating ? 'animate-spin' : ''}`} />
          Request Detour
        </button>
      </div>
    </div>
  );
}
