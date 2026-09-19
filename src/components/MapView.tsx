'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { authFetch } from '@/lib/api';
import Badge from '@/components/ui/Badge';

// Fix default marker icon issue with Next.js/webpack
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom colored circle icons
function circleIcon(color: string, size: number = 10) {
  return { radius: size, fillColor: color, color: '#fff', weight: 1.5, opacity: 0.9, fillOpacity: 0.85 };
}

// NE India bounds
const NE_CENTER: [number, number] = [25.5, 92.5];
const NE_ZOOM = 7;

interface MapData {
  locations: any[];
  warehouses: any[];
  hospitals: any[];
  vehicles: any[];
  alerts: any[];
}

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] glass-heavy rounded-lg p-3 text-xs space-y-1.5">
      <p className="font-bold text-white text-[0.7rem] mb-2">Map Legend</p>
      {[
        { color: '#A855F7', label: 'City/Town' },
        { color: '#22C55E', label: 'Warehouse' },
        { color: '#EF4444', label: 'Hospital' },
        { color: '#0D9488', label: 'Vehicle' },
        { color: '#F59E0B', label: 'Active Alert' },
      ].map(l => (
        <div key={l.label} className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
          <span className="text-mist-dim">{l.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function MapView({ className = '', height = '500px' }: { className?: string; height?: string }) {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState({
    locations: true, warehouses: true, hospitals: true, vehicles: true, alerts: true,
  });

  useEffect(() => {
    authFetch('/api/map-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-forest-200 rounded-xl ${className}`} style={{ height }}>
        <div className="ai-spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`flex items-center justify-center bg-forest-200 rounded-xl ${className}`} style={{ height }}>
        <p className="text-mist-muted text-sm">Map data unavailable</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{ height }}>
      {/* Layer toggles */}
      <div className="absolute top-3 right-3 z-[1000] glass-heavy rounded-lg p-2 flex gap-1.5">
        {[
          { key: 'locations', label: '📍', title: 'Locations' },
          { key: 'warehouses', label: '🏭', title: 'Warehouses' },
          { key: 'hospitals', label: '🏥', title: 'Hospitals' },
          { key: 'vehicles', label: '🚛', title: 'Vehicles' },
          { key: 'alerts', label: '⚠️', title: 'Alerts' },
        ].map(l => (
          <button key={l.key} title={l.title}
            onClick={() => setSelectedLayer(s => ({ ...s, [l.key]: !s[l.key as keyof typeof s] }))}
            className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-all ${selectedLayer[l.key as keyof typeof selectedLayer] ? 'bg-orchid/20 border border-orchid/30' : 'bg-white/5 border border-white/10 opacity-50'}`}>
            {l.label}
          </button>
        ))}
      </div>

      <MapLegend />

      <MapContainer center={NE_CENTER} zoom={NE_ZOOM} style={{ height: '100%', width: '100%' }}
        zoomControl={true} attributionControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Locations */}
        {selectedLayer.locations && data.locations.map((loc: any) => (
          <CircleMarker key={loc.id} center={[loc.lat, loc.lng]} {...circleIcon('#A855F7', loc.type === 'city' ? 8 : 5)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{loc.name}</p>
                <p className="text-gray-500">{loc.state} • {loc.type}</p>
                <p>Pop: {loc.population?.toLocaleString()} • Elev: {loc.elevation}m</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Warehouses */}
        {selectedLayer.warehouses && data.warehouses.map((wh: any) => (
          <CircleMarker key={wh.id} center={[wh.lat, wh.lng]} {...circleIcon('#22C55E', 9)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{wh.name}</p>
                <p>{wh.state} • {wh.status}</p>
                <p>Load: {wh.current_load_pct || wh.currentLoadPct}% • Cap: {wh.capacity_tons || wh.capacityTons}T</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Hospitals */}
        {selectedLayer.hospitals && data.hospitals.map((h: any) => (
          <CircleMarker key={h.id} center={[h.lat, h.lng]} {...circleIcon('#EF4444', 7)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{h.name}</p>
                <p>{h.state} • {h.type} • {h.beds} beds</p>
                <p>Emergency: {h.emergency ? '✅ Yes' : '❌ No'}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Vehicles */}
        {selectedLayer.vehicles && data.vehicles.map((v: any) => (
          <CircleMarker key={v.id} center={[v.lat, v.lng]} {...circleIcon('#0D9488', 6)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{v.id} — {v.type}</p>
                <p>Driver: {v.driver}</p>
                <p>Status: {v.status} • Fuel: {v.fuel_pct || v.fuelPct}%</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Alerts */}
        {selectedLayer.alerts && data.alerts.map((a: any) => (
          <CircleMarker key={a.id} center={[a.lat, a.lng]}
            {...circleIcon(a.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B', a.severity === 'CRITICAL' ? 14 : 11)}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-red-600">{a.severity}: {a.title}</p>
                <p>{a.message}</p>
                <p className="text-gray-400">{a.location}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
