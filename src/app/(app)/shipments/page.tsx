'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { hasPermission } from '@/lib/auth/roles';
import {
  Shipment,
  ShipmentItem,
  ShipmentSummaryMetrics,
  CargoClassification,
  ShipmentStatus,
} from '@/lib/types/shipments';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  X,
  Snowflake,
  Clock,
  MapPin,
  Tag,
  ArrowRight,
  Ban,
  Boxes,
  Truck,
  Layers,
  Thermometer,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonKPI, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function ShipmentsPage() {
  const { user } = useStore();
  const canCreate = user ? hasPermission(user.role, 'shipments:create') : false;
  const canUpdate = user ? hasPermission(user.role, 'shipments:update') : false;
  const canDispatch = user ? hasPermission(user.role, 'shipments:dispatch') : false;
  const canCancel = user ? hasPermission(user.role, 'shipments:cancel') : false;

  // Data state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [summary, setSummary] = useState<ShipmentSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals / Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'manifest' | 'items'>('manifest');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // New Shipment Form
  const [createForm, setCreateForm] = useState({
    origin_facility_id: '',
    destination_facility_id: '',
    cargo_classification: 'GENERAL_FREIGHT' as CargoClassification,
    priority: 'HIGH' as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    total_weight_kg: 500,
    total_volume_m3: 2.0,
    requires_cold_chain: false,
    min_temperature_c: '',
    max_temperature_c: '',
    notes: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Line Item Form (in drawer)
  const [newItemForm, setNewItemForm] = useState({
    sku: '',
    description: '',
    quantity: 10,
    unit_weight_kg: 25,
    unit_volume_m3: 0.1,
    is_hazardous: false,
    is_fragile: false,
  });
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  const fetchShipmentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const [summaryRes, listRes] = await Promise.all([
        fetch('/api/v1/shipments/summary'),
        fetch(`/api/v1/shipments?${params.toString()}`),
      ]);
      if (!summaryRes.ok) throw new Error('Failed to load shipment summary metrics');
      if (!listRes.ok) throw new Error('Failed to load shipment records');

      const [summaryJson, listJson] = await Promise.all([
        summaryRes.json(),
        listRes.json(),
      ]);
      setSummary(summaryJson.data);
      setShipments(listJson.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading shipment records');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, searchTerm]);

  useEffect(() => {
    fetchShipmentData();
  }, [fetchShipmentData]);

  const openShipmentDrawer = async (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setActiveDrawerTab('manifest');
    setDrawerLoading(true);
    try {
      const itemsRes = await fetch(`/api/v1/shipments/${shipment.id}/items`);
      if (itemsRes.ok) {
        const itemsJson = await itemsRes.json();
        setShipmentItems(itemsJson.data || []);
      }
    } catch (e) {
      console.error('Failed to load shipment items', e);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        origin_facility_id: createForm.origin_facility_id.trim(),
        destination_facility_id: createForm.destination_facility_id.trim(),
        cargo_classification: createForm.cargo_classification,
        priority: createForm.priority,
        total_weight_kg: Number(createForm.total_weight_kg),
        total_volume_m3: Number(createForm.total_volume_m3),
        requires_cold_chain: createForm.requires_cold_chain,
        notes: createForm.notes.trim() || undefined,
      };

      if (createForm.requires_cold_chain) {
        if (createForm.min_temperature_c) payload.min_temperature_c = Number(createForm.min_temperature_c);
        if (createForm.max_temperature_c) payload.max_temperature_c = Number(createForm.max_temperature_c);
      }

      const res = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create shipment');
      }

      setCreateModalOpen(false);
      setCreateForm({
        origin_facility_id: '',
        destination_facility_id: '',
        cargo_classification: 'GENERAL_FREIGHT',
        priority: 'HIGH',
        total_weight_kg: 500,
        total_volume_m3: 2.0,
        requires_cold_chain: false,
        min_temperature_c: '',
        max_temperature_c: '',
        notes: '',
      });
      fetchShipmentData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create shipment');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    setItemSubmitting(true);
    setItemError(null);

    try {
      const res = await fetch(`/api/v1/shipments/${selectedShipment.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newItemForm.sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
          description: newItemForm.description.trim(),
          quantity: Number(newItemForm.quantity),
          unit_weight_kg: Number(newItemForm.unit_weight_kg),
          unit_volume_m3: Number(newItemForm.unit_volume_m3),
          is_hazardous: newItemForm.is_hazardous,
          is_fragile: newItemForm.is_fragile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to add item to shipment');
      }

      setShipmentItems((prev) => [...prev, data.data]);
      setNewItemForm({
        sku: '',
        description: '',
        quantity: 10,
        unit_weight_kg: 25,
        unit_volume_m3: 0.1,
        is_hazardous: false,
        is_fragile: false,
      });

      fetchShipmentData();
      const refShipmentRes = await fetch(`/api/v1/shipments/${selectedShipment.id}`);
      if (refShipmentRes.ok) {
        const refJson = await refShipmentRes.json();
        setSelectedShipment(refJson.data);
      }
    } catch (err: unknown) {
      setItemError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: ShipmentStatus) => {
    if (!selectedShipment) return;
    try {
      const res = await fetch(`/api/v1/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update shipment status');

      setSelectedShipment(data.data);
      fetchShipmentData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  const handleCancelShipment = async () => {
    if (!selectedShipment) return;
    try {
      const res = await fetch(
        `/api/v1/shipments/${selectedShipment.id}?reason=${encodeURIComponent(cancelReason || 'Cancelled by user')}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel shipment');

      setCancelConfirmOpen(false);
      setCancelReason('');
      fetchShipmentData();
      setSelectedShipment(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error cancelling shipment');
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'LOW':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const getStatusBadgeClass = (s: ShipmentStatus) => {
    switch (s) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'IN_TRANSIT':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'DISPATCHED':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'ASSIGNED':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'PLANNED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-teal" />
            Consignment & Shipment Operations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end multi-drop freight manifests, cold-chain compliance, and trip assignments across Northeast India.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal hover:bg-teal-light text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-teal/20 focus:outline-none focus:ring-2 focus:ring-teal-light focus:ring-offset-2 focus:ring-offset-forest-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Create Shipment"
          >
            <Plus className="w-4 h-4 text-white" />
            Create Shipment
          </button>
        )}
      </div>

      {/* KPI Ribbon */}
      {loading && !summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonKPI key={i} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Active</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{summary.totalShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Total Consignments</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Planned</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{summary.plannedShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting Assignment</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Assigned</span>
              <Boxes className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{summary.assignedShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Linked to Trips</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">In Transit</span>
              <Truck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">{summary.inTransitShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Active on Corridor</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{summary.deliveredShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Fulfilled</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Cold Chain</span>
              <Snowflake className="w-4 h-4 text-brand-teal" />
            </div>
            <div className="text-2xl font-bold text-brand-teal">{summary.coldChainShipments}</div>
            <div className="text-xs text-slate-500 mt-1">Temp Controlled</div>
          </div>
        </div>
      ) : null}

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by tracking code, origin, destination, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-teal"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-teal"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-teal"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <ErrorState message={error} onRetry={fetchShipmentData} />
      ) : loading && shipments.length === 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <EmptyState
          title="No Shipments Found"
          description={
            searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No shipment records match your current filter criteria.'
              : 'There are no active shipments or consignments registered for your organization.'
          }
          icon={Package}
          primaryAction={canCreate ? { label: 'Create First Shipment', onClick: () => setCreateModalOpen(true) } : undefined}
        />
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Consignment / Code</th>
                  <th className="px-5 py-3">Route Nodes</th>
                  <th className="px-5 py-3">Cargo Classification</th>
                  <th className="px-5 py-3">Weight & Volume</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shipments.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openShipmentDrawer(s)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{s.shipmentCode}</span>
                        {s.requiresColdChain && (
                          <span
                            title={`Cold Chain: ${s.minTemperatureC ?? ''}°C to ${s.maxTemperatureC ?? ''}°C`}
                            className="inline-flex items-center text-cyan-400"
                          >
                            <Snowflake className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">{s.id}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[120px]" title={s.originFacilityId}>
                          {s.originFacilityId}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                        <span className="truncate max-w-[120px]" title={s.destinationFacilityId}>
                          {s.destinationFacilityId}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs text-slate-300 font-medium">
                        {s.cargoClassification.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {s.items?.length || 0} manifest items
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs font-medium text-slate-200">
                        {s.totalWeightKg.toLocaleString()} kg
                      </div>
                      <div className="text-[11px] text-slate-400">{s.totalVolumeM3.toFixed(2)} m³</div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${getPriorityBadgeClass(
                          s.priority
                        )}`}
                      >
                        {s.priority}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                          s.status
                        )}`}
                      >
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openShipmentDrawer(s);
                        }}
                        className="text-xs text-brand-teal hover:underline font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Shipment Detail Drawer */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(
                      selectedShipment.status
                    )}`}
                  >
                    {selectedShipment.status.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${getPriorityBadgeClass(
                      selectedShipment.priority
                    )}`}
                  >
                    {selectedShipment.priority}
                  </span>
                  {selectedShipment.requiresColdChain && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                      <Snowflake className="w-3 h-3" />
                      Cold Chain
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  {selectedShipment.shipmentCode}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5 font-mono text-xs">{selectedShipment.id}</p>
              </div>

              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-slate-800 px-6 gap-6 bg-slate-950/20 text-sm">
              <button
                onClick={() => setActiveDrawerTab('manifest')}
                className={`py-3 border-b-2 font-medium transition-colors ${
                  activeDrawerTab === 'manifest'
                    ? 'border-brand-teal text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Overview & Route
              </button>
              <button
                onClick={() => setActiveDrawerTab('items')}
                className={`py-3 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
                  activeDrawerTab === 'items'
                    ? 'border-brand-teal text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                Line Items ({shipmentItems.length})
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeDrawerTab === 'manifest' ? (
                <div className="space-y-6">
                  {/* Origin & Destination Card */}
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-teal" />
                      Facility Routing
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Origin Facility</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {selectedShipment.originFacilityId}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Destination Facility</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {selectedShipment.destinationFacilityId}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Physical Specs & Cargo Info */}
                  <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-blue-400" />
                      Consignment Specifications
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Classification</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {selectedShipment.cargoClassification.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Total Weight</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {selectedShipment.totalWeightKg.toLocaleString()} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Total Volume</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {selectedShipment.totalVolumeM3.toFixed(2)} m³
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Manifest Line Items</div>
                        <div className="font-medium text-slate-200 mt-0.5">
                          {shipmentItems.length} items
                        </div>
                      </div>
                      {selectedShipment.assignedTripId && (
                        <div>
                          <div className="text-xs text-slate-500">Assigned Trip ID</div>
                          <div className="font-medium text-cyan-400 mt-0.5 font-mono text-xs truncate">
                            {selectedShipment.assignedTripId}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cold Chain Specs if active */}
                  {selectedShipment.requiresColdChain && (
                    <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-2 flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-cyan-400" />
                        Temperature Compliance Requirements
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <div className="text-xs text-cyan-400/70">Minimum Permitted Temp</div>
                          <div className="font-semibold text-white mt-0.5">
                            {selectedShipment.minTemperatureC !== null
                              ? `${selectedShipment.minTemperatureC}°C`
                              : 'Not specified'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-cyan-400/70">Maximum Permitted Temp</div>
                          <div className="font-semibold text-white mt-0.5">
                            {selectedShipment.maxTemperatureC !== null
                              ? `${selectedShipment.maxTemperatureC}°C`
                              : 'Not specified'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes & Special Instructions */}
                  {selectedShipment.notes && (
                    <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-amber-400" />
                        Notes & Handling Instructions
                      </h3>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">
                        {selectedShipment.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Line Items */
                <div className="space-y-6">
                  {drawerLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : shipmentItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-800 rounded-xl p-6">
                      No SKU line items attached to this shipment yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shipmentItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 text-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{item.description}</span>
                                {item.sku && (
                                  <span className="text-xs text-slate-500 font-mono">[{item.sku}]</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                Quantity: {item.quantity} | Unit Weight: {item.unitWeightKg} kg |
                                Unit Volume: {item.unitVolumeM3} m³
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {item.isHazardous && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-950 text-red-400 border border-red-800">
                                  HAZMAT
                                </span>
                              )}
                              {item.isFragile && (
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950 text-amber-400 border border-amber-800">
                                  FRAGILE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Item form if shipment is editable */}
                  {canUpdate &&
                    (selectedShipment.status === 'PLANNED' || selectedShipment.status === 'ASSIGNED') && (
                      <form
                        onSubmit={handleAddItem}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4"
                      >
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Plus className="w-3.5 h-3.5 text-brand-teal" />
                          Add SKU / Line Item
                        </h4>

                        {itemError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                            {itemError}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-slate-400 block mb-1">Item Description *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Organic Black Rice Bags (25kg)"
                              value={newItemForm.description}
                              onChange={(e) =>
                                setNewItemForm({ ...newItemForm, description: e.target.value })
                              }
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">SKU Code (Optional)</label>
                            <input
                              type="text"
                              placeholder="SKU-NE-892"
                              value={newItemForm.sku}
                              onChange={(e) => setNewItemForm({ ...newItemForm, sku: e.target.value })}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Quantity *</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={newItemForm.quantity}
                              onChange={(e) =>
                                setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })
                              }
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Unit Weight (kg) *</label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              required
                              value={newItemForm.unit_weight_kg}
                              onChange={(e) =>
                                setNewItemForm({ ...newItemForm, unit_weight_kg: Number(e.target.value) })
                              }
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Unit Volume (m³) *</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={newItemForm.unit_volume_m3}
                              onChange={(e) =>
                                setNewItemForm({ ...newItemForm, unit_volume_m3: Number(e.target.value) })
                              }
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                            />
                          </div>

                          <div className="flex items-center gap-4 col-span-2 pt-1">
                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newItemForm.is_hazardous}
                                onChange={(e) =>
                                  setNewItemForm({ ...newItemForm, is_hazardous: e.target.checked })
                                }
                                className="rounded border-slate-800 bg-slate-900 text-brand-teal focus:ring-0"
                              />
                              Hazardous Material
                            </label>

                            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newItemForm.is_fragile}
                                onChange={(e) =>
                                  setNewItemForm({ ...newItemForm, is_fragile: e.target.checked })
                                }
                                className="rounded border-slate-800 bg-slate-900 text-brand-teal focus:ring-0"
                              />
                              Fragile Cargo
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={itemSubmitting}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg transition-colors"
                        >
                          {itemSubmitting ? 'Adding Line Item...' : 'Attach Item to Manifest'}
                        </button>
                      </form>
                    )}
                </div>
              )}
            </div>

            {/* Lifecycle Action Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {canDispatch && selectedShipment.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleUpdateStatus('DISPATCHED')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                  >
                    Mark Dispatched
                  </button>
                )}

                {canDispatch && selectedShipment.status === 'DISPATCHED' && (
                  <button
                    onClick={() => handleUpdateStatus('IN_TRANSIT')}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                  >
                    Mark In Transit
                  </button>
                )}

                {canDispatch &&
                  (selectedShipment.status === 'IN_TRANSIT' || selectedShipment.status === 'DISPATCHED') && (
                    <button
                      onClick={() => handleUpdateStatus('DELIVERED')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow"
                    >
                      Mark Delivered
                    </button>
                  )}
              </div>

              {canCancel &&
                selectedShipment.status !== 'DELIVERED' &&
                selectedShipment.status !== 'CANCELLED' && (
                  <button
                    onClick={() => setCancelConfirmOpen(true)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Cancel Shipment
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {cancelConfirmOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Ban className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Cancel Shipment Consignment</h3>
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to cancel tracking code{' '}
              <strong className="text-white">{selectedShipment.shipmentCode}</strong>? This action is
              logged in the immutable audit registry.
            </p>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Cancellation Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Consignee requested reschedule or road closure"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelConfirmOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
              >
                Keep Shipment
              </button>
              <button
                onClick={handleCancelShipment}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-lg"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shipment Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-teal" />
                <h2 className="text-lg font-bold text-white">Create Consignment Shipment</h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShipment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Origin Facility / Node *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. fac_guwahati_central"
                    value={createForm.origin_facility_id}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, origin_facility_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Destination Facility / Node *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. fac_shillong_cold_hub"
                    value={createForm.destination_facility_id}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, destination_facility_id: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        priority: e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  >
                    <option value="CRITICAL">Critical (Emergency Relief)</option>
                    <option value="HIGH">High (Express / Perishable)</option>
                    <option value="MEDIUM">Medium (Standard Scheduled)</option>
                    <option value="LOW">Low (Flexible Backlog)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cargo Classification</label>
                  <select
                    value={createForm.cargo_classification}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        cargo_classification: e.target.value as CargoClassification,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  >
                    <option value="GENERAL_FREIGHT">General Freight</option>
                    <option value="PERISHABLE">Perishable Produce</option>
                    <option value="PHARMACEUTICAL">Pharmaceutical</option>
                    <option value="HAZMAT">Hazardous Materials</option>
                    <option value="FRAGILE">Fragile Electronics</option>
                    <option value="LIVESTOCK">Livestock</option>
                    <option value="HEAVY_EQUIPMENT">Heavy Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Estimated Weight (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={createForm.total_weight_kg}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, total_weight_kg: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Estimated Volume (m³)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={createForm.total_volume_m3}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, total_volume_m3: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>

                {/* Cold chain toggle */}
                <div className="md:col-span-2 bg-slate-950/50 p-4 border border-slate-800/80 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createForm.requires_cold_chain}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          requires_cold_chain: e.target.checked,
                        })
                      }
                      className="rounded border-slate-800 bg-slate-900 text-brand-teal focus:ring-0"
                    />
                    Requires Cold-Chain / Temperature Control
                  </label>

                  {createForm.requires_cold_chain && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Min Permitted (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="2"
                          value={createForm.min_temperature_c}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, min_temperature_c: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Max Permitted (°C)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="8"
                          value={createForm.max_temperature_c}
                          onChange={(e) =>
                            setCreateForm({ ...createForm, max_temperature_c: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">Notes & Handling Details (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Keep dry, mountain switchbacks on route require careful strapping"
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-teal hover:bg-teal-light text-white font-semibold text-sm rounded-lg transition-all shadow-lg shadow-teal/20 focus:outline-none focus:ring-2 focus:ring-teal-light focus:ring-offset-2 focus:ring-offset-forest-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formSubmitting ? 'Creating Consignment...' : 'Save Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
