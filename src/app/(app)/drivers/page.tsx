'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { hasPermission } from '@/lib/auth/roles';
import { Driver, DriverDocument, DriverSummaryMetrics } from '@/lib/types/fleet';
import {
  Users,
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Mountain,
  Shield,
  Phone,
  Calendar,
  Award,
  Trash2,
  Clock,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import ErrorState from '@/components/ui/ErrorState';
import { SkeletonKPI, SkeletonCard } from '@/components/ui/LoadingSkeleton';

export default function DriversPage() {
  const { user } = useStore();
  const canManage = user ? hasPermission(user.role, 'drivers:manage') : false;

  // Data states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState<DriverSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dutyFilter, setDutyFilter] = useState('ALL');
  const [expFilter, setExpFilter] = useState<number | undefined>(undefined);

  // Modals / Drawers
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverDocs, setDriverDocs] = useState<DriverDocument[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);

  // Onboard form state
  const [onboardForm, setOnboardForm] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: new Date(Date.now() + 365 * 3 * 86400000).toISOString().split('T')[0],
    mountain_experience_years: 3,
    duty_status: 'AVAILABLE',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Document form state
  const [docForm, setDocForm] = useState({
    document_type: 'COMMERCIAL_LICENSE',
    document_number: '',
    issued_at: new Date().toISOString().split('T')[0],
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  const fetchDriverData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dutyFilter !== 'ALL') params.set('duty_status', dutyFilter);
      if (expFilter !== undefined) params.set('min_experience', expFilter.toString());
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const [summaryRes, listRes] = await Promise.all([
        fetch('/api/v1/drivers/summary'),
        fetch(`/api/v1/drivers?${params.toString()}`),
      ]);
      if (!summaryRes.ok) throw new Error('Failed to load driver roster metrics');
      if (!listRes.ok) throw new Error('Failed to load driver roster');

      const [summaryJson, listJson] = await Promise.all([
        summaryRes.json(),
        listRes.json(),
      ]);
      setSummary(summaryJson.data);
      setDrivers(listJson.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading driver records');
    } finally {
      setLoading(false);
    }
  }, [dutyFilter, expFilter, searchTerm]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const openDriverDrawer = async (d: Driver) => {
    setSelectedDriver(d);
    setDrawerLoading(true);
    try {
      const docRes = await fetch(`/api/v1/drivers/${d.id}/documents`);
      if (docRes.ok) {
        const docJson = await docRes.json();
        setDriverDocs(docJson.data);
      }
    } catch (err) {
      console.error('Failed to load driver documents:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch('/api/v1/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to onboard driver');

      setOnboardModalOpen(false);
      setOnboardForm({
        name: '',
        phone: '',
        email: '',
        license_number: '',
        license_expiry: new Date(Date.now() + 365 * 3 * 86400000).toISOString().split('T')[0],
        mountain_experience_years: 3,
        duty_status: 'AVAILABLE',
      });
      fetchDriverData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    try {
      const res = await fetch(`/api/v1/drivers/${selectedDriver.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });
      if (res.ok) {
        const data = await res.json();
        setDriverDocs((prev) => [data.data, ...prev]);
        setDocForm({
          document_type: 'COMMERCIAL_LICENSE',
          document_number: '',
          issued_at: new Date().toISOString().split('T')[0],
          expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to record driver document:', err);
    }
  };

  const handleDutyStatusChange = async (newStatus: string) => {
    if (!selectedDriver) return;
    try {
      const res = await fetch(`/api/v1/drivers/${selectedDriver.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duty_status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDriver(data.data);
        fetchDriverData();
      }
    } catch (err) {
      console.error('Failed to update duty status:', err);
    }
  };

  const handleSuspendDriver = async () => {
    if (!selectedDriver) return;
    try {
      const res = await fetch(`/api/v1/drivers/${selectedDriver.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuspendConfirmOpen(false);
        setSelectedDriver(null);
        fetchDriverData();
      }
    } catch (err) {
      console.error('Failed to suspend driver:', err);
    }
  };

  const getDutyBadgeClass = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-safe/15 text-safe border-safe/30';
      case 'ON_TRIP':
        return 'bg-teal/15 text-teal border-teal/30';
      case 'RESTING':
        return 'bg-amber/15 text-amber border-amber/30';
      case 'OFF_DUTY':
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
            <Users className="text-orchid" size={28} /> Driver Roster
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Personnel registry, mountain road endorsements, duty hours of service & safety ratings
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setOnboardModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orchid text-white font-semibold text-sm hover:bg-orchid-light transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Onboard Driver
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
                <span>Total Roster</span>
                <Users size={16} className="text-mist-dim" />
              </div>
              <div className="text-2xl font-bold text-white">{summary?.totalDrivers ?? 0}</div>
              <div className="text-[11px] text-mist-dim mt-1">Active drivers</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Available</span>
                <CheckCircle2 size={16} className="text-safe" />
              </div>
              <div className="text-2xl font-bold text-safe">{summary?.availableDrivers ?? 0}</div>
              <div className="text-[11px] text-safe/80 mt-1">Ready for assignment</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>On Trip</span>
                <Clock size={16} className="text-teal" />
              </div>
              <div className="text-2xl font-bold text-teal">{summary?.onTripDrivers ?? 0}</div>
              <div className="text-[11px] text-teal/80 mt-1">In transit</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Resting</span>
                <Clock size={16} className="text-amber" />
              </div>
              <div className="text-2xl font-bold text-amber">{summary?.restingDrivers ?? 0}</div>
              <div className="text-[11px] text-amber/80 mt-1">Mandatory HOS rest</div>
            </div>

            <div className="bg-forest-200/70 border border-white/5 rounded-xl p-4 col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-xs text-mist-muted mb-1">
                <span>Avg Safety Score</span>
                <Award size={16} className="text-orchid" />
              </div>
              <div className="text-2xl font-bold text-white">{summary?.avgSafetyScore ?? 0}</div>
              <div className="text-[11px] text-orchid/80 mt-1">
                Avg exp: {summary?.avgMountainExperienceYears ?? 0} yrs
              </div>
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
            placeholder="Search driver name, phone, or license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-sm text-white placeholder-mist-muted focus:outline-none focus:border-orchid transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={dutyFilter}
            onChange={(e) => setDutyFilter(e.target.value)}
            className="px-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-xs font-medium text-mist focus:outline-none focus:border-orchid"
          >
            <option value="ALL">All Duty Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="RESTING">Resting (HOS)</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>

          <select
            value={expFilter ?? 'ALL'}
            onChange={(e) => setExpFilter(e.target.value === 'ALL' ? undefined : Number(e.target.value))}
            className="px-3 py-2 bg-forest-500/80 border border-white/10 rounded-lg text-xs font-medium text-mist focus:outline-none focus:border-orchid"
          >
            <option value="ALL">All Mountain Experience</option>
            <option value="1">1+ Years in NER</option>
            <option value="3">3+ Years in NER</option>
            <option value="5">5+ Years (Master Driver)</option>
          </select>
        </div>
      </div>

      {/* 4. Drivers Data Table or Empty/Error States */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
          <SkeletonCard className="h-16" />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Driver Roster"
          message={error}
          onRetry={fetchDriverData}
        />
      ) : drivers.length === 0 ? (
        <EmptyState
          title="No Drivers Onboarded"
          description={
            searchTerm || dutyFilter !== 'ALL' || expFilter !== undefined
              ? 'No drivers found matching the specified filters. Try clearing your search parameters.'
              : 'Your organization does not have any drivers onboarded yet. Onboard drivers to assign trips.'
          }
          primaryAction={
            canManage && !searchTerm && dutyFilter === 'ALL' && expFilter === undefined
              ? {
                  label: 'Onboard First Driver',
                  onClick: () => setOnboardModalOpen(true),
                }
              : {
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearchTerm('');
                    setDutyFilter('ALL');
                    setExpFilter(undefined);
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
                  <th className="py-3.5 px-4">Driver Name</th>
                  <th className="py-3.5 px-3">Contact</th>
                  <th className="py-3.5 px-3">License & Expiry</th>
                  <th className="py-3.5 px-3">Mountain Exp</th>
                  <th className="py-3.5 px-3">Duty Status</th>
                  <th className="py-3.5 px-3">Safety Score</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {drivers.map((d) => {
                  const initials = d.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                      onClick={() => openDriverDrawer(d)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orchid/20 border border-orchid/30 flex items-center justify-center text-orchid-light font-bold text-xs">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-white font-sans text-sm">{d.name}</div>
                            <div className="text-[11px] text-mist-muted font-sans">{d.email || 'No email registered'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <div className="flex items-center gap-1.5 text-mist-light">
                          <Phone size={13} className="text-mist-dim" /> {d.phone}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-white">{d.licenseNumber}</div>
                        <div className="text-[11px] text-mist-dim flex items-center gap-1 mt-0.5">
                          <Calendar size={12} /> {d.licenseExpiry.split('T')[0]}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <div className="flex items-center gap-1 text-amber">
                          <Mountain size={14} /> {d.mountainExperienceYears} yrs
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getDutyBadgeClass(
                            d.dutyStatus
                          )}`}
                        >
                          {d.dutyStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-safe">
                          <Award size={14} /> {d.safetyScore}/100
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDriverDrawer(d);
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-orchid/20 text-mist-light hover:text-orchid rounded border border-white/10 text-xs font-sans transition-all"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Slide-out Driver Profile Drawer */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-forest-400 border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-forest-500/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orchid/20 border border-orchid/30 flex items-center justify-center text-orchid-light font-bold text-sm">
                  {selectedDriver.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-sans">{selectedDriver.name}</h2>
                  <p className="text-mist-muted text-xs font-mono">{selectedDriver.licenseNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-mist-dim hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerLoading ? (
                <div className="space-y-4">
                  <SkeletonCard className="h-20" />
                  <SkeletonCard className="h-20" />
                </div>
              ) : (
                <>
                  {/* Duty Status Quick Toggle */}
                  <div className="bg-forest-200/50 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-mist-dim uppercase tracking-wider">Duty Status</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getDutyBadgeClass(selectedDriver.dutyStatus)}`}>
                        {selectedDriver.dutyStatus}
                      </span>
                    </div>
                    {canManage && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          onClick={() => handleDutyStatusChange('AVAILABLE')}
                          className={`py-1.5 text-xs font-semibold rounded border transition-all ${
                            selectedDriver.dutyStatus === 'AVAILABLE'
                              ? 'bg-safe text-forest-500 border-safe'
                              : 'bg-white/5 border-white/10 text-mist-dim hover:bg-white/10'
                          }`}
                        >
                          Available
                        </button>
                        <button
                          onClick={() => handleDutyStatusChange('RESTING')}
                          className={`py-1.5 text-xs font-semibold rounded border transition-all ${
                            selectedDriver.dutyStatus === 'RESTING'
                              ? 'bg-amber text-forest-500 border-amber'
                              : 'bg-white/5 border-white/10 text-mist-dim hover:bg-white/10'
                          }`}
                        >
                          Resting (HOS)
                        </button>
                        <button
                          onClick={() => handleDutyStatusChange('OFF_DUTY')}
                          className={`py-1.5 text-xs font-semibold rounded border transition-all ${
                            selectedDriver.dutyStatus === 'OFF_DUTY'
                              ? 'bg-mist text-forest-500 border-mist'
                              : 'bg-white/5 border-white/10 text-mist-dim hover:bg-white/10'
                          }`}
                        >
                          Off Duty
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Profile Details Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-forest-200/50 border border-white/5 rounded-xl p-4">
                    <div>
                      <div className="text-xs text-mist-dim">Mobile Phone</div>
                      <div className="text-sm font-semibold text-white mt-0.5">{selectedDriver.phone}</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Safety Score</div>
                      <div className="text-sm font-bold text-safe mt-0.5">{selectedDriver.safetyScore} / 100</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">Mountain Experience</div>
                      <div className="text-sm font-semibold text-amber mt-0.5">{selectedDriver.mountainExperienceYears} years in NER</div>
                    </div>
                    <div>
                      <div className="text-xs text-mist-dim">License Valid Until</div>
                      <div className="text-sm font-semibold text-white mt-0.5">{selectedDriver.licenseExpiry.split('T')[0]}</div>
                    </div>
                  </div>

                  {/* Certifications and Documents */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <FileText size={16} className="text-orchid" /> Driver Certifications ({driverDocs.length})
                      </h3>
                    </div>

                    {canManage && (
                      <form onSubmit={handleAddDocSubmit} className="bg-forest-200/50 border border-white/5 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs font-semibold text-orchid uppercase tracking-wider flex items-center gap-1.5">
                          <Plus size={14} /> Add Certification / Permit
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-mist-dim block mb-1">Doc Type</label>
                            <select
                              value={docForm.document_type}
                              onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
                              className="w-full bg-forest-500 border border-white/10 rounded p-2 text-xs text-white"
                            >
                              <option value="COMMERCIAL_LICENSE">Commercial Driver License</option>
                              <option value="MOUNTAIN_HILL_ENDORSEMENT">Mountain / Hill Endorsement</option>
                              <option value="MEDICAL_FITNESS">Medical Fitness Clearance</option>
                              <option value="POLICE_VERIFICATION">Police Verification Certificate</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] text-mist-dim block mb-1">Doc Number</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. MHE-AS-2026-99"
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
                          className="w-full py-2 bg-orchid/20 text-orchid-light hover:bg-orchid hover:text-white font-semibold rounded text-xs transition-all"
                        >
                          Record Certification
                        </button>
                      </form>
                    )}

                    <div className="space-y-2">
                      {driverDocs.length === 0 ? (
                        <p className="text-mist-muted text-center py-6 text-xs">No certification documents recorded yet.</p>
                      ) : (
                        driverDocs.map((doc) => (
                          <div key={doc.id} className="bg-forest-500/60 border border-white/5 rounded-lg p-3 text-xs space-y-1">
                            <div className="flex items-center justify-between font-semibold text-white">
                              <span>{doc.documentType.replace(/_/g, ' ')}</span>
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
                </>
              )}
            </div>

            {/* Drawer Footer / Suspend Action */}
            {canManage && (
              <div className="p-4 border-t border-white/10 bg-forest-500/90 flex justify-between items-center">
                <span className="text-xs text-mist-muted">Driver Lifecycle</span>
                <button
                  onClick={() => setSuspendConfirmOpen(true)}
                  className="px-3 py-1.5 rounded bg-danger/20 text-danger hover:bg-danger hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 size={14} /> Suspend Driver
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Onboard Driver Modal */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-forest-400 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-orchid" size={20} /> Onboard New Driver
              </h3>
              <button
                onClick={() => setOnboardModalOpen(false)}
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

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-mist-dim block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tenzing Norbu"
                  value={onboardForm.name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                  className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Mobile Phone (India) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="driver@logistics.in"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Commercial License No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AS-01-2024-9988"
                    value={onboardForm.license_number}
                    onChange={(e) => setOnboardForm({ ...onboardForm, license_number: e.target.value.toUpperCase() })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">License Expiry *</label>
                  <input
                    type="date"
                    required
                    value={onboardForm.license_expiry}
                    onChange={(e) => setOnboardForm({ ...onboardForm, license_expiry: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Mountain Driving Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={onboardForm.mountain_experience_years}
                    onChange={(e) => setOnboardForm({ ...onboardForm, mountain_experience_years: Number(e.target.value) })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid"
                  />
                </div>
                <div>
                  <label className="text-xs text-mist-dim block mb-1">Initial Duty Status</label>
                  <select
                    value={onboardForm.duty_status}
                    onChange={(e) => setOnboardForm({ ...onboardForm, duty_status: e.target.value })}
                    className="w-full bg-forest-500 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-orchid"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RESTING">Resting</option>
                    <option value="OFF_DUTY">Off Duty</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-mist text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-orchid text-white font-semibold text-sm hover:bg-orchid-light transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'Onboarding...' : 'Onboard Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Suspend Confirmation Dialog */}
      {suspendConfirmOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-forest-400 border border-danger/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-danger mb-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">Suspend / Deactivate Driver</h3>
            </div>
            <p className="text-mist-muted text-sm mb-4">
              Are you sure you want to suspend <strong className="text-white">{selectedDriver.name}</strong>?
              Their duty status will be set to OFF_DUTY and they will be unassigned from any vehicle. Historical trip logs will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSuspendConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-mist text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendDriver}
                className="px-4 py-2 rounded-lg bg-danger text-white font-semibold text-sm hover:bg-danger/80 transition-all"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
