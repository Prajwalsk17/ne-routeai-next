'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import DispatchMap, {
  DispatchMapRoute,
  DispatchMapVehicle,
  DispatchMapIncident,
  DispatchMapSafeLocation,
} from '@/components/DispatchMap';
import Badge from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import {
  Navigation,
  Volume2,
  VolumeX,
  AlertOctagon,
  Shield,
  RotateCcw,
  Play,
  Pause,
  ArrowUp,
  Phone,
  CheckCircle2,
  Radio,
  MapPin,
  Compass,
} from 'lucide-react';

interface SafeHaven {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  contactNumber: string;
  coordinates: { lat: number; lng: number };
  hasValidCoords: boolean;
}

type GpsStatus = 'LIVE' | 'PERMISSION_REQUIRED' | 'UNAVAILABLE' | 'DENIED' | 'STALE' | 'ERROR';

// Benchmarking points for explicit simulated driving test runs
const SIMULATION_POINTS = [
  { lat: 25.8000, lng: 93.8300, speed: 42, heading: 115, altitude: 720, sector: 'NH-29 Medziphema Ascending Ridge' },
  { lat: 25.7700, lng: 93.8900, speed: 38, heading: 118, altitude: 890, sector: 'NH-29 Pherima Hairpin Curve' },
  { lat: 25.7400, lng: 93.9500, speed: 32, heading: 122, altitude: 1080, sector: 'NH-29 Piphema Mountain Pass' },
  { lat: 25.7200, lng: 94.0100, speed: 25, heading: 125, altitude: 1240, sector: 'NH-29 Approaching Zubza Sector' },
  { lat: 25.7100, lng: 94.0280, speed: 0, heading: 130, altitude: 1310, sector: 'NH-29 Zubza Landslide Obstacle' },
];

export default function DriverNavigationPage() {
  const { user } = useStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  // Authenticated Driver & Vehicle Identity
  const driverName = user?.name || 'Officer Tenzing Norbu';
  const vehicleReg = 'AS-01-AX-1010 (Utility 4x4)';
  const [shipmentCode, setShipmentCode] = useState('SHP-1048');

  // GPS Sensor & Geolocation Telemetry State
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('PERMISSION_REQUIRED');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [currentHeading, setCurrentHeading] = useState<number | null>(null);
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [currentSector, setCurrentSector] = useState<string>('Corridor Telemetry Standby');
  const [lastGpsTimestamp, setLastGpsTimestamp] = useState<string | null>(null);
  const lastGpsTimeMsRef = useRef<number | null>(null);

  // Device Hardware Sensors State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Hazards & Alerts State
  const [hazardWarning, setHazardWarning] = useState<any | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isDetoured, setIsDetoured] = useState(false);
  const [recalcSummary, setRecalcSummary] = useState<string | null>(null);
  const [safeHavensOpen, setSafeHavensOpen] = useState(false);
  const [selectedHavenId, setSelectedHavenId] = useState<string | null>(null);
  const [plannedRoadGeometry, setPlannedRoadGeometry] = useState<[number, number][]>([]);
  const [detourRoadGeometry, setDetourRoadGeometry] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMin, setRouteDurationMin] = useState<number | null>(null);
  const [gpsBreadcrumbs, setGpsBreadcrumbs] = useState<[number, number][]>([]);

  // Live Safe Havens List (Fetched from backend)
  const [safeHavens, setSafeHavens] = useState<SafeHaven[]>([]);
  const [safeHavensLoading, setSafeHavensLoading] = useState(true);

  // Distance calculation helper
  const getDistanceKm = useCallback((c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) => {
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
  }, []);

  // Fetch real Safe Havens from backend API
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/facilities')
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        const facs = json?.data?.facilities || [];
        const havens: SafeHaven[] = facs.map((f: any) => {
          const coords = f.coordinates || {};
          const hasCoords =
            typeof coords.lat === 'number' &&
            typeof coords.lng === 'number' &&
            !isNaN(coords.lat) &&
            !isNaN(coords.lng) &&
            coords.lat !== 0 &&
            coords.lng !== 0;

          let dist = f.distanceKm || 0;
          if (hasCoords && currentCoords) {
            dist = getDistanceKm(currentCoords, coords);
          }

          return {
            id: f.id,
            name: f.name,
            type: f.type || 'SHELTER',
            distanceKm: dist,
            contactNumber: f.contactNumber || '+91-361-2130200',
            coordinates: hasCoords ? coords : { lat: NaN, lng: NaN },
            hasValidCoords: hasCoords,
          };
        });

        havens.sort((a, b) => {
          if (!a.hasValidCoords) return 1;
          if (!b.hasValidCoords) return -1;
          return a.distanceKm - b.distanceKm;
        });

        setSafeHavens(havens);
        setSafeHavensLoading(false);
      })
      .catch(() => {
        if (isMounted) setSafeHavensLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentCoords, getDistanceKm]);

  // Network & Battery Hardware Sensor Monitoring
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Staleness Monitor: Mark GPS as STALE if no update received for >60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastGpsTimeMsRef.current && gpsStatus === 'LIVE' && !isSimulating) {
        const ageSec = (Date.now() - lastGpsTimeMsRef.current) / 1000;
        if (ageSec > 60) {
          setGpsStatus('STALE');
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [gpsStatus, isSimulating]);

  // Transmit real or benchmark GPS Telemetry Ping to Server
  const transmitTelemetry = useCallback(
    async (
      coords: { lat: number; lng: number },
      speed: number | null,
      heading: number | null,
      altitude: number | null,
      accuracy: number | null
    ) => {
      try {
        await fetch('/api/v1/telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_id: 'c0000000-0000-0000-0000-000000000001',
            shipment_id: 'shp-active-01',
            latitude: coords.lat,
            longitude: coords.lng,
            speed_kmh: speed || 0,
            heading_degrees: heading || 0,
            altitude_meters: altitude || 0,
            accuracy_meters: accuracy || 10,
          }),
        });
      } catch {
        // Handled silently
      }
    },
    []
  );

  // Browser Geolocation integration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('geolocation' in navigator)) {
      setGpsStatus('UNAVAILABLE');
      return;
    }

    let watchId: number;

    const onLocationSuccess = (pos: GeolocationPosition) => {
      if (isSimulating) return; // Simulation overrides browser position

      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentCoords(coords);
      setGpsAccuracy(pos.coords.accuracy);
      setGpsStatus('LIVE');
      lastGpsTimeMsRef.current = Date.now();
      setLastGpsTimestamp(new Date(pos.timestamp).toLocaleTimeString());

      if (pos.coords.speed !== null && !isNaN(pos.coords.speed)) {
        setCurrentSpeed(Math.round(pos.coords.speed * 3.6)); // m/s to km/h
      } else {
        setCurrentSpeed(null);
      }

      if (pos.coords.altitude !== null && !isNaN(pos.coords.altitude)) {
        setCurrentAltitude(Math.round(pos.coords.altitude));
      } else {
        setCurrentAltitude(null);
      }

      if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
        setCurrentHeading(Math.round(pos.coords.heading));
      } else {
        setCurrentHeading(null);
      }

      setCurrentSector('Live Physical Location');
      transmitTelemetry(
        coords,
        pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
        pos.coords.heading ? Math.round(pos.coords.heading) : null,
        pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
        pos.coords.accuracy
      );
    };

    const onLocationError = (err: GeolocationPositionError) => {
      if (isSimulating) return;

      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('DENIED');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGpsStatus('UNAVAILABLE');
      } else {
        setGpsStatus('ERROR');
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      });
    } catch {
      setGpsStatus('UNAVAILABLE');
    }

    return () => {
      if (watchId !== undefined && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isSimulating, transmitTelemetry]);

  // Request browser permission explicitly if prompted
  const requestGpsPermission = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsAccuracy(pos.coords.accuracy);
          setGpsStatus('LIVE');
          lastGpsTimeMsRef.current = Date.now();
        },
        (err) => {
          setGpsStatus(err.code === 1 ? 'DENIED' : 'UNAVAILABLE');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Check Advance Hazard Proximity
  useEffect(() => {
    if (!currentCoords) return;
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

  // URL query params binding
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

  // Benchmark simulation step timer (when explicitly enabled for testing)
  useEffect(() => {
    if (!isSimulating) return;

    const pt = SIMULATION_POINTS[simIndex];
    setCurrentCoords({ lat: pt.lat, lng: pt.lng });
    setCurrentSpeed(pt.speed);
    setCurrentHeading(pt.heading);
    setCurrentAltitude(pt.altitude);
    setCurrentSector(pt.sector);
    setGpsAccuracy(4.5);

    const timer = setInterval(() => {
      setSimIndex((prev) => {
        const next = (prev + 1) % SIMULATION_POINTS.length;
        const p = SIMULATION_POINTS[next];
        setCurrentCoords({ lat: p.lat, lng: p.lng });
        setCurrentSpeed(p.speed);
        setCurrentHeading(p.heading);
        setCurrentAltitude(p.altitude);
        setCurrentSector(p.sector);
        transmitTelemetry({ lat: p.lat, lng: p.lng }, p.speed, p.heading, p.altitude, 4.5);
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [isSimulating, simIndex, transmitTelemetry]);

  // Load real road-following route from OSRM for Dimapur to Kohima corridor
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/routes/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_id: 'LOC005', // Dimapur
        destination_id: 'LOC006', // Kohima
        vehicle_type: 'UTILITY_4X4',
        avoid_incidents: false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data?.coordinates && data.data.coordinates.length >= 2) {
          setPlannedRoadGeometry(data.data.coordinates);
          setRouteDistanceKm(data.data.distanceKm);
          setRouteDurationMin(data.data.durationMinutes);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [shipmentCode]);

  // Record driver's actual GPS telemetry breadcrumbs (distinct from planned route)
  useEffect(() => {
    if (currentCoords && typeof currentCoords.lat === 'number' && typeof currentCoords.lng === 'number') {
      setGpsBreadcrumbs((prev) => {
        const last = prev[prev.length - 1];
        if (last && Math.abs(last[0] - currentCoords.lng) < 0.0001 && Math.abs(last[1] - currentCoords.lat) < 0.0001) {
          return prev;
        }
        return [...prev.slice(-49), [currentCoords.lng, currentCoords.lat]];
      });
    }
  }, [currentCoords]);

  // Execute Dynamic Route Recalculation
  const handleRecalculateDetour = async () => {
    setIsRecalculating(true);
    try {
      const activeLat = currentCoords?.lat || 25.8000;
      const activeLng = currentCoords?.lng || 93.8300;
      const res = await fetch('/api/v1/routes/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: 'shp-active-01',
          current_lat: activeLat,
          current_lng: activeLng,
          reason: 'Driver initiated detour due to active Zubza landslide blockage',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsDetoured(true);
        setHazardWarning(null);
        const detourCoords = data.data?.recalculation?.routeResult?.coordinates;
        if (detourCoords && Array.isArray(detourCoords) && detourCoords.length >= 2) {
          setDetourRoadGeometry(detourCoords);
        }
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

  const activeLat = currentCoords?.lat;
  const activeLng = currentCoords?.lng;

  // Build Map Elements
  const mapRoutes: DispatchMapRoute[] = [];

  // 1. PLANNED ROAD NETWORK CORRIDOR (from OSRM routing engine)
  const activeRoadCoords = isDetoured && detourRoadGeometry.length >= 2
    ? detourRoadGeometry
    : plannedRoadGeometry;

  if (activeRoadCoords.length >= 2) {
    mapRoutes.push({
      id: 'driver-planned-route',
      coordinates: activeRoadCoords,
      isAlternative: isDetoured,
      isBlocked: !isDetoured && !!hazardWarning,
      color: isDetoured ? '#10B981' : hazardWarning ? '#EF4444' : '#A855F7',
      label: isDetoured
        ? 'Recalculated Detour Corridor'
        : hazardWarning
        ? 'Blocked Sector NH-29'
        : 'Planned Road Corridor NH-29',
      isGpsTrack: false,
    });
  }

  // 2. ACTUAL VEHICLE GPS TRACK (actual telemetry positions, strictly distinct from planned route)
  if (gpsBreadcrumbs.length >= 2) {
    mapRoutes.push({
      id: 'driver-actual-gps-track',
      coordinates: gpsBreadcrumbs,
      isGpsTrack: true,
      color: '#06B6D4',
      label: 'Actual Vehicle GPS Track',
    });
  }

  const mapVehicles: DispatchMapVehicle[] = currentCoords
    ? [
        {
          id: 'driver-vehicle',
          label: 'Your Vehicle (4x4)',
          coordinates: currentCoords,
          speedKmh: currentSpeed || 0,
          headingDegrees: currentHeading || 0,
          status: 'IN_TRANSIT',
        },
      ]
    : [];

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

  const mapSafeLocations: DispatchMapSafeLocation[] = safeHavens
    .filter((sh) => sh.hasValidCoords && !isNaN(sh.coordinates.lat) && !isNaN(sh.coordinates.lng))
    .map((sh) => ({
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
            {isSimulating ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400">
                  SYNTHETIC BENCHMARK SIMULATION
                </span>
              </>
            ) : gpsStatus === 'LIVE' ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">
                  GPS STATUS = LIVE {gpsAccuracy ? `(±${gpsAccuracy.toFixed(0)}m)` : ''}
                </span>
              </>
            ) : gpsStatus === 'STALE' ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400">
                  GPS STATUS = STALE {lastGpsTimestamp ? `(${lastGpsTimestamp})` : ''}
                </span>
              </>
            ) : gpsStatus === 'DENIED' ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-xs font-mono font-bold tracking-wider text-danger-light">
                  GPS STATUS = PERMISSION DENIED
                </span>
              </>
            ) : gpsStatus === 'PERMISSION_REQUIRED' ? (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-amber-300">
                  GPS STATUS = PERMISSION REQUIRED
                </span>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs font-mono font-bold tracking-wider text-slate-400">
                  GPS STATUS = UNAVAILABLE
                </span>
              </>
            )}
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
            <Badge variant="LOW">IN TRANSIT</Badge>
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

        {/* Geolocation Permission Prompt button if needed */}
        {gpsStatus !== 'LIVE' && !isSimulating && (
          <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-mist-dim text-[11px]">Real device GPS location inactive</span>
            <button
              onClick={requestGpsPermission}
              className="px-2.5 py-1 rounded bg-teal/20 text-teal-light text-[11px] font-semibold hover:bg-teal/30"
            >
              Enable GPS
            </button>
          </div>
        )}
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
          initialCenter={activeLng && activeLat ? [activeLng, activeLat] : [93.7266, 25.9068]}
        />

        {/* Speedometer, Altitude, & Heading HUD Overlay */}
        <div className="absolute top-3 left-3 z-10 flex gap-2">
          <div className="bg-[#14201A]/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10 shadow-lg text-center min-w-[64px]">
            <div className="text-[9px] text-slate-400 font-semibold uppercase">Speed</div>
            <div className="text-sm font-black font-mono text-teal-300">
              {currentSpeed !== null ? (
                <>
                  {currentSpeed}{' '}
                  <span className="text-[9px] font-normal text-slate-400">km/h</span>
                </>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Unavailable</span>
              )}
            </div>
          </div>
          <div className="bg-[#14201A]/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10 shadow-lg text-center min-w-[64px]">
            <div className="text-[9px] text-slate-400 font-semibold uppercase">Altitude</div>
            <div className="text-sm font-black font-mono text-purple-300">
              {currentAltitude !== null ? (
                <>
                  {currentAltitude}{' '}
                  <span className="text-[9px] font-normal text-slate-400">m</span>
                </>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Unavailable</span>
              )}
            </div>
          </div>
          <div className="bg-[#14201A]/90 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10 shadow-lg text-center min-w-[64px]">
            <div className="text-[9px] text-slate-400 font-semibold uppercase">Heading</div>
            <div className="text-sm font-black font-mono text-amber-300">
              {currentHeading !== null ? (
                <>{currentHeading}°</>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Unavailable</span>
              )}
            </div>
          </div>
        </div>

        {/* Battery & Network Status Pill */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-[#14201A]/90 backdrop-blur-md rounded-lg px-2.5 py-1 border border-white/10 shadow-lg text-[10px] font-mono text-slate-300">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {batteryLevel !== null && (
            <>
              <span className="text-slate-600">|</span>
              <span>BAT: {batteryLevel}%</span>
            </>
          )}
        </div>

        {/* Benchmark Simulation Toggle Overlay */}
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
            {isSimulating ? 'Stop Benchmark' : 'Benchmark Drive'}
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
                    {sh.hasValidCoords ? (
                      `${sh.distanceKm} km away · ${sh.type}`
                    ) : (
                      <span className="text-amber-400 font-medium">Verified location unavailable. · {sh.type}</span>
                    )}
                  </div>
                </div>
                {sh.hasValidCoords && sh.contactNumber ? (
                  <a
                    href={`tel:${sh.contactNumber}`}
                    className="p-2 rounded-md bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                ) : null}
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
