'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layers, Compass, ZoomIn, ZoomOut, Maximize2, Shield, AlertTriangle, Truck, Eye } from 'lucide-react';

export interface DispatchMapRoute {
  id: string;
  coordinates: [number, number][]; // [lng, lat]
  isAlternative?: boolean;
  isBlocked?: boolean;
  color?: string;
  label?: string;
}

export interface DispatchMapVehicle {
  id: string;
  label: string;
  coordinates: { lat: number; lng: number };
  speedKmh?: number;
  headingDegrees?: number;
  status?: string;
}

export interface DispatchMapIncident {
  id: string;
  title: string;
  type: string;
  severity: string;
  coordinates: { lat: number; lng: number };
  affectedRadiusMeters?: number;
}

export interface DispatchMapSafeLocation {
  id: string;
  name: string;
  type: string;
  coordinates: { lat: number; lng: number };
  distanceKm?: number;
}

export interface DispatchMapProps {
  className?: string;
  height?: string;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  routes?: DispatchMapRoute[];
  vehicles?: DispatchMapVehicle[];
  incidents?: DispatchMapIncident[];
  safeLocations?: DispatchMapSafeLocation[];
  selectedVehicleId?: string | null;
  onVehicleClick?: (vehicleId: string) => void;
  onIncidentClick?: (incidentId: string) => void;
  showLayerControls?: boolean;
}

// Watermark-free, open raster tile styles
const BASE_STYLES: Record<string, maplibregl.StyleSpecification> = {
  dark: {
    version: 8,
    sources: {
      'esri-dark-base': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      },
      'esri-dark-ref': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; Esri',
      },
    },
    layers: [
      {
        id: 'esri-dark-base-layer',
        type: 'raster',
        source: 'esri-dark-base',
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: 'esri-dark-ref-layer',
        type: 'raster',
        source: 'esri-dark-ref',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
      },
      'esri-satellite-ref': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: '&copy; Esri',
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 19,
      },
      {
        id: 'esri-satellite-ref-layer',
        type: 'raster',
        source: 'esri-satellite-ref',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  streets: {
    version: 8,
    sources: {
      'osm-streets': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-streets-layer',
        type: 'raster',
        source: 'osm-streets',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
};

export default function DispatchMap({
  className = '',
  height = '560px',
  initialCenter = [92.8, 26.2], // Northeast India geographic centroid
  initialZoom = 7,
  routes = [],
  vehicles = [],
  incidents = [],
  safeLocations = [],
  selectedVehicleId,
  onVehicleClick,
  onIncidentClick,
  showLayerControls = true,
}: DispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [activeBaseStyle, setActiveBaseStyle] = useState<'dark' | 'satellite' | 'streets'>('dark');
  const [layers, setLayers] = useState({
    routes: true,
    vehicles: true,
    incidents: true,
    safeLocations: true,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const [styleRevision, setStyleRevision] = useState(0);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: BASE_STYLES[activeBaseStyle],
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;
      setIsMapReady(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update base tile style
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    map.setStyle(BASE_STYLES[activeBaseStyle]);
    map.once('style.load', () => {
      setStyleRevision((r) => r + 1);
    });
  }, [activeBaseStyle]);

  // Update Route Polyline Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clean existing route layers/sources
    const currentSources = map.getStyle().sources || {};
    routes.forEach((r, idx) => {
      const sourceId = `route-source-${idx}`;
      const layerId = `route-layer-${idx}`;
      const glowLayerId = `route-glow-${idx}`;

      if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    });

    if (!layers.routes) return;

    routes.forEach((route, idx) => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const sourceId = `route-source-${idx}`;
      const layerId = `route-layer-${idx}`;
      const glowLayerId = `route-glow-${idx}`;

      const color = route.isBlocked
        ? '#EF4444' // Crimson
        : route.isAlternative
        ? '#10B981' // Emerald
        : route.color || '#A855F7'; // Orchid Default

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { label: route.label || `Route ${idx + 1}` },
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        },
      });

      // Ambient glow layer
      map.addLayer({
        id: glowLayerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 3,
        },
      });

      // Core crisp vector line
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': route.isAlternative ? 4 : 5,
          'line-dasharray': route.isBlocked ? [2, 2] : [1, 0],
        },
      });
    });
  }, [routes, layers.routes, isMapReady, styleRevision]);

  // Update Markers (Vehicles, Incidents, Safe Havens)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Vehicles
    if (layers.vehicles) {
      vehicles.forEach((v) => {
        const el = document.createElement('div');
        el.className = 'vehicle-marker-wrapper cursor-pointer';

        const isSelected = selectedVehicleId === v.id;
        const heading = v.headingDegrees || 0;

        el.innerHTML = `
          <div class="relative flex items-center justify-center p-2 rounded-full border ${
            isSelected
              ? 'bg-teal-500/30 border-teal-300 ring-4 ring-teal-400/40 shadow-lg shadow-teal-500/50'
              : 'bg-[#14201A]/90 border-teal-500/80 shadow-md shadow-black/60'
          }" style="width: 38px; height: 38px; backdrop-filter: blur(8px);">
            <div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
              </svg>
            </div>
            ${
              v.speedKmh && v.speedKmh > 0
                ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>'
                : ''
            }
          </div>
        `;

        el.onclick = () => {
          if (onVehicleClick) onVehicleClick(v.id);
        };

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="background:#14201A; color:#E2E8F0; padding:8px 12px; border-radius:8px; border:1px solid rgba(45,212,191,0.3); font-family:sans-serif; font-size:12px;">
            <div style="font-weight:700; color:#2DD4BF; margin-bottom:4px;">🚚 ${v.label}</div>
            <div style="color:#94A3B8;">Speed: <span style="color:#fff;">${v.speedKmh || 0} km/h</span></div>
            <div style="color:#94A3B8;">Status: <span style="color:#A855F7; text-transform:uppercase;">${v.status || 'ACTIVE'}</span></div>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.coordinates.lng, v.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 2. Incidents
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const el = document.createElement('div');
        el.className = 'incident-marker-wrapper cursor-pointer';

        const isCritical = inc.severity === 'CRITICAL';
        const color = isCritical ? '#EF4444' : '#F59E0B';

        el.innerHTML = `
          <div class="relative flex items-center justify-center rounded-full border animate-pulse"
               style="width: 32px; height: 32px; background: rgba(20, 32, 26, 0.95); border-color: ${color}; box-shadow: 0 0 14px ${color}88;">
            <span style="font-size: 16px;">
              ${inc.type === 'LANDSLIDE' ? '⛰️' : inc.type === 'FLOOD' ? '🌊' : '⚠️'}
            </span>
            <span class="absolute inset-0 rounded-full border-2" style="border-color: ${color}; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></span>
          </div>
        `;

        el.onclick = () => {
          if (onIncidentClick) onIncidentClick(inc.id);
        };

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="background:#14201A; color:#E2E8F0; padding:8px 12px; border-radius:8px; border:1px solid ${color}66; font-family:sans-serif; font-size:12px; max-width:220px;">
            <div style="font-weight:700; color:${color}; margin-bottom:4px;">⚠ ${inc.title}</div>
            <div style="color:#94A3B8; margin-bottom:2px;">Type: <span style="color:#fff;">${inc.type}</span></div>
            <div style="color:#94A3B8;">Severity: <span style="color:${color}; font-weight:600;">${inc.severity}</span></div>
            ${inc.affectedRadiusMeters ? `<div style="color:#64748B; font-size:10px; margin-top:4px;">Radius: ${inc.affectedRadiusMeters}m</div>` : ''}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([inc.coordinates.lng, inc.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    // 3. Safe Emergency Havens
    if (layers.safeLocations) {
      safeLocations.forEach((safe) => {
        const el = document.createElement('div');
        el.className = 'safe-marker-wrapper cursor-pointer';

        el.innerHTML = `
          <div class="flex items-center justify-center rounded-full border bg-[#14201A]/90 border-emerald-500/80 shadow-md shadow-black/60"
               style="width: 28px; height: 28px;">
            <span style="font-size: 14px;">
              ${safe.type === 'HOSPITAL' ? '🏥' : safe.type === 'POLICE_POST' ? '🚓' : '🏕️'}
            </span>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="background:#14201A; color:#E2E8F0; padding:8px 12px; border-radius:8px; border:1px solid rgba(16,185,129,0.4); font-family:sans-serif; font-size:12px;">
            <div style="font-weight:700; color:#34D399; margin-bottom:2px;">🛡️ ${safe.name}</div>
            <div style="color:#94A3B8;">Type: <span style="color:#fff;">${safe.type}</span></div>
            ${safe.distanceKm ? `<div style="color:#64748B; font-size:10px; margin-top:2px;">${safe.distanceKm} km from vehicle</div>` : ''}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([safe.coordinates.lng, safe.coordinates.lat])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [vehicles, incidents, safeLocations, layers, selectedVehicleId, isMapReady]);

  // Fit bounds helper
  const fitAllPoints = () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = new maplibregl.LngLatBounds();
    let hasPoints = false;

    routes.forEach((r) => {
      r.coordinates.forEach((coord) => {
        bounds.extend(coord);
        hasPoints = true;
      });
    });

    vehicles.forEach((v) => {
      bounds.extend([v.coordinates.lng, v.coordinates.lat]);
      hasPoints = true;
    });

    incidents.forEach((i) => {
      bounds.extend([i.coordinates.lng, i.coordinates.lat]);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 1200 });
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/10 ${className}`} style={{ height }}>
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full bg-[#0F1714]" />

      {/* Floating Header Controls */}
      {showLayerControls && (
        <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 items-center">
          {/* Base Layer Switcher */}
          <div className="flex bg-[#14201A]/90 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-lg shadow-black/50 text-xs">
            {(['dark', 'satellite', 'streets'] as const).map((style) => (
              <button
                key={style}
                onClick={() => setActiveBaseStyle(style)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition-colors ${
                  activeBaseStyle === style
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Layer Visibility Toggles */}
          <div className="flex bg-[#14201A]/90 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-lg shadow-black/50 text-xs gap-1">
            <button
              onClick={() => setLayers((s) => ({ ...s, routes: !s.routes }))}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                layers.routes
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-500 line-through'
              }`}
            >
              <Eye className="w-3 h-3" /> Routes
            </button>
            <button
              onClick={() => setLayers((s) => ({ ...s, vehicles: !s.vehicles }))}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                layers.vehicles
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-500 line-through'
              }`}
            >
              <Truck className="w-3 h-3" /> Fleet
            </button>
            <button
              onClick={() => setLayers((s) => ({ ...s, incidents: !s.incidents }))}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                layers.incidents
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-slate-500 line-through'
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> Hazards
            </button>
            <button
              onClick={() => setLayers((s) => ({ ...s, safeLocations: !s.safeLocations }))}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                layers.safeLocations
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-500 line-through'
              }`}
            >
              <Shield className="w-3 h-3" /> Havens
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Tools (Right Top) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={fitAllPoints}
          title="Fit bounds to all routes & fleet"
          className="p-2 rounded-lg bg-[#14201A]/90 hover:bg-[#1C2E25] text-slate-300 hover:text-white border border-white/10 shadow-lg backdrop-blur-md transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#14201A]/90 backdrop-blur-md rounded-lg p-3 border border-white/10 text-xs shadow-lg shadow-black/50 space-y-1.5 hidden sm:block">
        <div className="font-semibold text-slate-300 text-[11px] mb-1.5 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-purple-400" /> Operational Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-[#A855F7] rounded-full inline-block" />
          <span className="text-slate-400">Primary Planned Route</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-[#10B981] rounded-full inline-block" />
          <span className="text-slate-400">Recalculated Detour</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 bg-[#EF4444] rounded-full inline-block border-b border-dashed" />
          <span className="text-slate-400">Hazard / Blocked Sector</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
          <span className="text-slate-400">Active Vehicle Location</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-400">Critical Hazard Event</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          <span className="text-slate-400">Emergency Safe Haven</span>
        </div>
      </div>
    </div>
  );
}
