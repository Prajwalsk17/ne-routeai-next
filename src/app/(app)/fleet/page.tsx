'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { hasPermission } from '@/lib/auth/roles';
import { Vehicle, VehicleDocument, VehicleMaintenance, FleetSummaryMetrics } from '@/lib/types/fleet';
import {
  Truck,
  Fuel,
  Plus,
  Search,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Snowflake,
  Mountain,
  Waves,
  Shield,
  Clock,
  Trash2,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonKPI, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function FleetPage() {
  const { user } = useStore();
  const canManage = user ? hasPermission(user.role, 'fleet:manage') : false;

  // Data state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<FleetSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals / Drawers
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'specs' | 'docs' | 'maint'>('specs');
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [vehicleMaint, setVehicleMaint] = useState<VehicleMaintenance[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    registration_number: '',
    make_model: '',
    type: 'UTILITY_4X4',
    payload_capacity_kg: 1500,
    cargo_volume_m3: 4.5,
    max_gradient_pct: 22,
    max_width_meters: 2.1,
    water_crossing_depth_mm: 450,
    has_cold_chain: false,
    fuel_type: 'DIESEL',
    current_fuel_pct: 95,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Doc form state
  const [docForm, setDocForm] = useState({
    document_type: 'FITNESS_CERTIFICATE',
    document_number: '',
    issued_at: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  // Maintenance form state
  const [maintForm, setMaintForm] = useState({
    maintenance_type: 'ROUTINE_SERVICE',
    odometer_km: 12500,
    description: 'Mountain road post-monsoon brake and suspension inspection',
    cost_inr: 4500,
    service_provider: 'Guwahati Fleet Depot',
  });

  const fetchFleetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const [summaryRes, listRes] = await Promise.all([
        fetch('/api/v1/fleet/summary'),
        fetch(`/api/v1/fleet/vehicles?${params.toString()}`),
      ]);
      if (!summaryRes.ok) throw new Error('Failed to load fleet summary metrics');
      if (!listRes.ok) throw new Error('Failed to load vehicle registry');

      const [summaryJson, listJson] = await Promise.all([
        summaryRes.json(),
        listRes.json(),
      ]);
      setSummary(summaryJson.data);
      setVehicles(listJson.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading fleet records');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

  // Load drawer details when vehicle is selected
  const openVehicleDrawer = async (v: Vehicle) => {
    setSelectedVehicle(v);
    setActiveDrawerTab('specs');
    setDrawerLoading(true);
    try {
      const [docRes, maintRes] = await Promise.all([
        fetch(`/api/v1/fleet/vehicles/${v.id}/documents`),
        fetch(`/api/v1/fleet/vehicles/${v.id}/maintenance`),
      ]);
      if (docRes.ok) {
        const docJson = await docRes.json();
        setVehicleDocs(docJson.data);
      }
      if (maintRes.ok) {
        const maintJson = await maintRes.json();
        setVehicleMaint(maintJson.data);
      }
    } catch (err) {
      console.error('Failed to load vehicle drawer relations:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/v1/fleet/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to register vehicle');

      setRegisterModalOpen(false);
      setRegisterForm({
        registration_number: '',
        make_model: '',
        type: 'UTILITY_4X4',
        payload_capacity_kg: 1500,
        cargo_volume_m3: 4.5,
        max_gradient_pct: 22,
        max_width_meters: 2.1,
        water_crossing_depth_mm: 450,
        has_cold_chain: false,
        fuel_type: 'DIESEL',
        current_fuel_pct: 95,
      });
      fetchFleetData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const res = await fetch(`/api/v1/fleet/vehicles/${selectedVehicle.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleDocs((prev) => [data.data, ...prev]);
        setDocForm({
          document_type: 'FITNESS_CERTIFICATE',
          document_number: '',
          issued_at: new Date().toISOString().split('T')[0],
          expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to record document:', err);
    }
  };

  const handleAddMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    try {
      const res = await fetch(`/api/v1/fleet/vehicles/${selectedVehicle.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintForm),
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleMaint((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to record maintenance:', err);
    }
  };

  const handleArchiveVehicle = async () => {
    if (!selectedVehicle) return;
    try {
      const res = await fetch(`/api/v1/fleet/vehicles/${selectedVehicle.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setArchiveConfirmOpen(false);
        setSelectedVehicle(null);
        fetchFleetData();
      }
    } catch (err) {
      console.error('Failed to archive vehicle:', err);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-safe/15 text-safe border-safe/30';
      case 'IN_TRANSIT':
        return 'bg-teal/15 text-teal border-teal/30';
      case 'MAINTENANCE':
        return 'bg-amber/15 text-amber border-amber/30';
      case 'OFFLINE':
      default:
        return 'bg-mist-muted/20 text-mist-dim border-white/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Truck className="text-teal" size={28} /> Fleet Management
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            NER terrain-rated vehicle registry, mountain gradient clearances, and maintenance lifecycles
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal text-forest-500 font-semibold text-sm hover:bg-teal-light transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Register Vehicle
          </button>
        )}
      </div>

      {/* 2. KPI Summary Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loading && !summary ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonKPI key={i} />)
        ) : (
          <>
            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Total Fleet</span>
                <Truck size={16} className="text-mist-dim" />
              </div>
              <div className="text-2xl font-bold text-white">{summary?.totalVehicles ?? 0}</div>
              <div className="text-[11px] text-mist-dim mt-1">Active units</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Available</span>
                <CheckCircle2 size={16} className="text-safe" />
              </div>
              <div className="text-2xl font-bold text-safe">{summary?.availableVehicles ?? 0}</div>
              <div className="text-[11px] text-safe/80 mt-1">Ready for dispatch</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>In Transit</span>
                <Truck size={16} className="text-teal" />
              </div>
              <div className="text-2xl font-bold text-teal">{summary?.inTransitVehicles ?? 0}</div>
              <div className="text-[11px] text-teal/80 mt-1">On mountain routes</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>In Shop</span>
                <Wrench size={16} className="text-amber" />
              </div>
              <div className="text-2xl font-bold text-amber">{summary?.maintenanceVehicles ?? 0}</div>
              <div className="text-[11px] text-amber/80 mt-1">Under maintenance</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4 col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Avg Fuel</span>
                <Fuel size={16} className="text-orchid" />
              </div>
              <div className="text-2xl font-bold text-white">{summary?.avgFuelPct ?? 0}%</div>
              <div className="text-[11px] text-orchid/80 mt-1">{summary?.coldChainVehicles ?? 0} cold-chain units</div>
            </div>
          </>
        )}
      </div>

      {/* 3. Action Bar: Search & Filters */}
      <div className="bg-forest-200/40 border border-white/5 rounded-xl p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-muted" />
          <input
            type="text"
            placeholder="Search registration or make/model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-sm text-white placeholder-mist-muted focus:outline-none focus:border-teal transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-xs font-medium text-mist focus:outline-none focus:border-teal"
          >
            <option value="ALL">All Vehicle Types</option>
            <option value="UTILITY_4X4">Utility 4x4 AWD</option>
            <option value="MINI_TRUCK">Mini Truck</option>
            <option value="MEDIUM_TRUCK">Medium Truck</option>
            <option value="HEAVY_TRUCK">Heavy Truck</option>
            <option value="REFRIGERATED_TRUCK">Refrigerated (Cold Chain)</option>
            <option value="LIGHT_VAN">Light Delivery Van</option>
            <option value="BOAT">Riverine Boat</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-xs font-medium text-mist focus:outline-none focus:border-teal"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="MAINTENANCE">In Maintenance</option>
            <option value="OFFLINE">Offline / Standby</option>
          </select>
        </div>
      </div>

      {/* 4. Vehicles Data Table or States */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Fleet Registry"
          message={error}
          onRetry={fetchFleetData}
        />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No Vehicles Registered"
          description={
            searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No vehicles match your active search or status filters. Try clearing your filters.'
              : 'Your organization does not have any vehicles registered in the fleet registry yet.'
          }
          primaryAction={
            canManage && !searchTerm && typeFilter === 'ALL' && statusFilter === 'ALL'
              ? {
                  label: 'Register First Vehicle',
                  onClick: () => setRegisterModalOpen(true),
                }
              : {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchTerm('');
                    setTypeFilter('ALL');
                    setStatusFilter('ALL');
                  },
                }
          }
        />
      ) : (
        <div className="bg-forest-200/50 border border-white/5 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-mist">
              <thead className="bg-forest-400/90 text-xs font-semibold text-mist-dim uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4">Registration & Model</th>
                  <th className="py-3.5 px-3">Type</th>
                  <th className="py-3.5 px-3">Payload / Vol</th>
                  <th className="py-3.5 px-3">Terrain Clearance</th>
                  <th className="py-3.5 px-3">Fuel</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {vehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    onClick={() => openVehicleDrawer(v)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white font-sans text-sm flex items-center gap-2">
                        {v.registrationNumber}
                        {v.hasColdChain && (
                          <span title="Cold-Chain Certified">
                            <Snowflake size={14} className="text-teal" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-mist-muted font-sans mt-0.5">{v.makeModel}</div>
                    </td>
                    <td className="py-3.5 px-3 font-sans">
                      <span className="px-2 py-0.5 bg-white/5 rounded text-[11px] text-mist-light border border-white/10">
                        {v.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div>{v.payloadCapacityKg.toLocaleString()} kg</div>
                      <div className="text-[11px] text-mist-dim">{v.cargoVolumeM3} m³</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-amber">
                        <Mountain size={14} /> {v.maxGradientPct}% gradient
                      </div>
                      <div className="text-[11px] text-mist-dim flex items-center gap-1 mt-0.5">
                        <Waves size={12} /> {v.waterCrossingDepthMm} mm ford
                      </div>
                    </td>
                    <td className="py-3.5 px-3 w-28">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>{v.currentFuelPct}%</span>
                        <span className="text-mist-dim">{v.fuelType}</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            v.currentFuelPct > 50
                              ? 'bg-safe'
                              : v.currentFuelPct > 20
                              ? 'bg-amber'
                              : 'bg-danger'
                          }`}
                          style={{ width: `${v.currentFuelPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusBadgeClass(
                          v.status
                        )}`}
                      >
                        {v.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openVehicleDrawer(v);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-teal/20 text-mist-light hover:text-teal rounded border border-white/10 text-xs font-sans transition-all"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Slide-out Vehicle Detail Drawer */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-forest-400 border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-forest-500/80">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white font-mono">{selectedVehicle.registrationNumber}</h2>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadgeClass(
                      selectedVehicle.status
                    )}`}
                  >
                    {selectedVehicle.status}
                  </span>
                </div>
                <p className="text-mist-muted text-xs mt-1">{selectedVehicle.makeModel} ({selectedVehicle.type})</p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-mist-dim hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-white/10 bg-forest-500/50 px-5 text-sm">
              <button
                onClick={() => setActiveDrawerTab('specs')}
                className={`py-3 px-3 border-b-2 font-medium transition-all ${
                  activeDrawerTab === 'specs'
                    ? 'border-teal text-teal font-semibold'
                    : 'border-transparent text-mist-muted hover:text-white'
                }`}
              >
                Terrain & Specs
              </button>
              <button
                onClick={() => setActiveDrawerTab('docs')}
                className={`py-3 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 ${
                  activeDrawerTab === 'docs'
                    ? 'border-teal text-teal font-semibold'
                    : 'border-transparent text-mist-muted hover:text-white'
                }`}
              >
                <FileText size={15} /> Documents ({vehicleDocs.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('maint')}
                className={`py-3 px-3 border-b-2 font-medium transition-all flex items-center gap-1.5 ${
                  activeDrawerTab === 'maint'
                    ? 'border-teal text-teal font-semibold'
                    : 'border-transparent text-mist-muted hover:text-white'
                }`}
              >
                <Wrench size={15} /> Maintenance ({vehicleMaint.length})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerLoading ? (
                <div className="space-y-4">
                  <SkeletonCard className="h-20" />
                  <SkeletonCard className="h-20" />
                </div>
              ) : activeDrawerTab === 'specs' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 bg-forest-200/50 border border-white/5 rounded-xl p-4">
                    <div>
                      <div className="text-xs text-mist-dim">Payload Capacity</div>
                      <div className="text-base font-bold text-white mt-0.5">{selectedVehicle.payloadCapacityKg.toLocaleString()} kg</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Cargo Volume</div>
                      <div className="text-base font-bold text-white mt-0.5">{selectedVehicle.cargoVolumeM3} m³</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Max Mountain Gradient</div>
                      <div className="text-base font-bold text-amber mt-0.5">{selectedVehicle.maxGradientPct}% slope</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Max Vehicle Width</div>
                      <div className="text-base font-bold text-white mt-0.5">{selectedVehicle.maxWidthMeters} meters</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Water Crossing Limit</div>
                      <div className="text-base font-bold text-teal mt-0.5">{selectedVehicle.waterCrossingDepthMm} mm</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Cold Chain Capability</div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {selectedVehicle.hasColdChain ? 'Yes (Certified)' : 'No'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-forest-200/50 border border-white/5 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-mist-dim uppercase tracking-wider">Fuel & Powertrain</h4>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-mist-muted">Powertrain Type:</span>
                      <span className="font-semibold text-white">{selectedVehicle.fuelType}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-mist-muted">Fuel Level:</span>
                      <span className="font-mono font-bold text-white">{selectedVehicle.currentFuelPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal rounded-full"
                        style={{ width: `${selectedVehicle.currentFuelPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : activeDrawerTab === 'docs' ? (
                <div className="space-y-5">
                  {canManage && (
                    <form onSubmit={handleAddDocSubmit} className="bg-forest-200/50 border border-white/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-teal uppercase tracking-wider flex items-center gap-1.5">
                        <Plus size={14} /> Add Compliance Document
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Doc Type</label>
                          <select
                            value={docForm.document_type}
                            onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          >
                            <option value="FITNESS_CERTIFICATE">Fitness Certificate</option>
                            <option value="MOUNTAIN_PERMIT">Mountain Road Permit</option>
                            <option value="REGISTRATION_CERTIFICATE">RC</option>
                            <option value="INSURANCE">Insurance Policy</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Doc Number</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. AS-RC-88921"
                            value={docForm.document_number}
                            onChange={(e) => setDocForm({ ...docForm, document_number: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Issue Date</label>
                          <input
                            type="date"
                            value={docForm.issued_at}
                            onChange={(e) => setDocForm({ ...docForm, issued_at: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={docForm.expires_at}
                            onChange={(e) => setDocForm({ ...docForm, expires_at: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-teal/20 text-teal hover:bg-teal hover:text-forest-500 font-semibold rounded text-xs transition-all"
                      >
                        Record Document
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {vehicleDocs.length === 0 ? (
                      <p className="text-mist-muted text-center py-6 text-xs">No documents uploaded yet.</p>
                    ) : (
                      vehicleDocs.map((doc) => (
                        <div key={doc.id} className="bg-forest-500/60 border border-white/5 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-white">
                            <span>{doc.documentType.replace('_', ' ')}</span>
                            <span className="text-safe flex items-center gap-1">
                              <Shield size={12} /> Verified
                            </span>
                          </div>
                          <div className="text-mist-dim font-mono">{doc.documentNumber}</div>
                          <div className="flex justify-between text-[11px] text-mist-muted pt-1">
                            <span>Issued: {doc.issuedAt.split('T')[0]}</span>
                            <span>Expires: {doc.expiresAt.split('T')[0]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {canManage && (
                    <form onSubmit={handleAddMaintSubmit} className="bg-forest-200/50 border border-white/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-amber uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench size={14} /> Log Maintenance Event
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Service Type</label>
                          <select
                            value={maintForm.maintenance_type}
                            onChange={(e) => setMaintForm({ ...maintForm, maintenance_type: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          >
                            <option value="ROUTINE_SERVICE">Routine Service</option>
                            <option value="BRAKE_OVERHAUL">Brake Overhaul</option>
                            <option value="SUSPENSION_MOUNTAIN">Mountain Suspension Check</option>
                            <option value="TIRE_ROTATION">Tire Rotation</option>
                            <option value="EMERGERING_REPAIR">Emergency Repair</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Odometer (km)</label>
                          <input
                            type="number"
                            required
                            value={maintForm.odometer_km}
                            onChange={(e) => setMaintForm({ ...maintForm, odometer_km: Number(e.target.value) })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-mist-dim block mb-1">Work Description</label>
                        <input
                          type="text"
                          required
                          value={maintForm.description}
                          onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })}
                          className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Cost (INR)</label>
                          <input
                            type="number"
                            value={maintForm.cost_inr}
                            onChange={(e) => setMaintForm({ ...maintForm, cost_inr: Number(e.target.value) })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-mist-dim block mb-1">Provider / Depot</label>
                          <input
                            type="text"
                            value={maintForm.service_provider}
                            onChange={(e) => setMaintForm({ ...maintForm, service_provider: e.target.value })}
                            className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-amber/20 text-amber hover:bg-amber hover:text-forest-500 font-semibold rounded text-xs transition-all"
                      >
                        Record Maintenance Log
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {vehicleMaint.length === 0 ? (
                      <p className="text-mist-muted text-center py-6 text-xs">No maintenance records logged.</p>
                    ) : (
                      vehicleMaint.map((m) => (
                        <div key={m.id} className="bg-forest-500/60 border border-white/5 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-white">
                            <span>{m.maintenanceType.replace('_', ' ')}</span>
                            <span className="text-mist-dim font-mono">{m.odometerKm.toLocaleString()} km</span>
                          </div>
                          <p className="text-mist-light text-[11px]">{m.description}</p>
                          <div className="flex justify-between text-[11px] text-mist-muted pt-1">
                            <span>Cost: ₹{m.costInr?.toLocaleString() ?? 0}</span>
                            <span>{m.performedAt.split('T')[0]}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer / Decommission Action */}
            {canManage && (
              <div className="p-4 border-t border-white/10 bg-forest-500/90 flex justify-between items-center">
                <span className="text-xs text-mist-muted">Asset Lifecycle</span>
                <button
                  onClick={() => setArchiveConfirmOpen(true)}
                  className="px-3 py-1.5 rounded bg-danger/20 text-danger hover:bg-danger hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 size={14} /> Decommission Vehicle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Register Vehicle Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-forest-400 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="text-teal" size={20} /> Register New Fleet Vehicle
              </h3>
              <button
                onClick={() => setRegisterModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-mist-dim hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-danger/15 border border-danger/30 rounded-lg text-danger text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AS-01-AX-1010"
                    value={registerForm.registration_number}
                    onChange={(e) => setRegisterForm({ ...registerForm, registration_number: e.target.value.toUpperCase() })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Make & Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata 407 Gold 4x4"
                    value={registerForm.make_model}
                    onChange={(e) => setRegisterForm({ ...registerForm, make_model: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Vehicle Classification *</label>
                  <select
                    value={registerForm.type}
                    onChange={(e) => setRegisterForm({ ...registerForm, type: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  >
                    <option value="UTILITY_4X4">Utility 4x4 (High Clearance)</option>
                    <option value="MINI_TRUCK">Mini Truck</option>
                    <option value="MEDIUM_TRUCK">Medium Truck</option>
                    <option value="HEAVY_TRUCK">Heavy Duty Truck</option>
                    <option value="REFRIGERATED_TRUCK">Refrigerated Truck</option>
                    <option value="LIGHT_VAN">Light Van</option>
                    <option value="BOAT">Riverine Boat</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Fuel / Powertrain</label>
                  <select
                    value={registerForm.fuel_type}
                    onChange={(e) => setRegisterForm({ ...registerForm, fuel_type: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  >
                    <option value="DIESEL">Diesel</option>
                    <option value="EV">Electric (EV)</option>
                    <option value="PETROL">Petrol</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Payload Capacity (kg) *</label>
                  <input
                    type="number"
                    required
                    value={registerForm.payload_capacity_kg}
                    onChange={(e) => setRegisterForm({ ...registerForm, payload_capacity_kg: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Cargo Volume (m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={registerForm.cargo_volume_m3}
                    onChange={(e) => setRegisterForm({ ...registerForm, cargo_volume_m3: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Max Gradient (%)</label>
                  <input
                    type="number"
                    value={registerForm.max_gradient_pct}
                    onChange={(e) => setRegisterForm({ ...registerForm, max_gradient_pct: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Max Width (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={registerForm.max_width_meters}
                    onChange={(e) => setRegisterForm({ ...registerForm, max_width_meters: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Water Depth (mm)</label>
                  <input
                    type="number"
                    value={registerForm.water_crossing_depth_mm}
                    onChange={(e) => setRegisterForm({ ...registerForm, water_crossing_depth_mm: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="cold_chain_cb"
                  checked={registerForm.has_cold_chain}
                  onChange={(e) => setRegisterForm({ ...registerForm, has_cold_chain: e.target.checked })}
                  className="rounded bg-forest-500 border-white/20 text-teal focus:ring-0"
                />
                <label htmlFor="cold_chain_cb" className="text-xs text-mist-light cursor-pointer">
                  Equipped with Temperature-Controlled Cold-Chain Box (2°C – 8°C)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-mist text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-teal text-forest-500 font-semibold text-sm hover:bg-teal-light transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'Registering...' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Archive Confirmation Dialog */}
      {archiveConfirmOpen && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-forest-400 border border-danger/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-danger mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Decommission Vehicle</h3>
            </div>
            <p className="text-mist-muted text-sm mb-4">
              Are you sure you want to decommission <strong className="text-white font-mono">{selectedVehicle.registrationNumber}</strong>?
              This vehicle will be marked offline and withdrawn from future dispatches. Historical trip and audit logs will remain intact.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setArchiveConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-mist text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveVehicle}
                className="px-4 py-2 rounded-lg bg-danger text-white font-semibold text-sm hover:bg-danger/80 transition-all"
              >
                Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
