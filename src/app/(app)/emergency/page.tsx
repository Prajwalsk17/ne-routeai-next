'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { LOCATIONS, CARGO_TYPES, MISSION_TYPES } from '@/lib/seed-data';
import type { EmergencyResult, EmergencyAction, Priority } from '@/lib/types';
import {
  Siren,
  Zap,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Send,
  Edit3,
  X,
  History,
  Info,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function EmergencyPage() {
  const { setActiveMission, setActiveEmergencyCount } = useStore();

  const [form, setForm] = useState({
    mission_type: 'Medical',
    origin_id: 'LOC001',
    destination_id: 'LOC024',
    cargo_type: 'Emergency Medicine',
    cargo_weight_kg: 500,
    priority: 'CRITICAL' as Priority,
  });

  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Notification / Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);

  // Modal States
  const [modifyOpen, setModifyOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [actionNoticeModal, setActionNoticeModal] = useState<{ open: boolean; title: string; notice: string; isExternal: boolean } | null>(null);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Modify Form State
  const [modifyForm, setModifyForm] = useState({
    priority: 'CRITICAL' as Priority,
    corridor: '',
    transportMode: 'ROAD',
    emergencyLevel: 'LEVEL 2 - REGIONAL EMERGENCY',
    cargoType: 'Emergency Medicine',
    destination: 'LOC024',
    departureTime: 'Immediate (T+00:15)',
    resources: 'Highway Patrol Escorts, VMS Alerts, Heavy Wrecker Standby',
    agencies: 'State Disaster Management Authority, Traffic Police, BRO',
    notes: 'Prioritize temperature-sensitive cargo without transit delays.',
  });

  // Override Form State
  const [overrideForm, setOverrideForm] = useState({
    reason: 'Severe Local Weather Change',
    decision: 'Divert convoy to intermediate Tezpur logistics depot and hold until Sela Pass visibility improves.',
    justification: 'Ground weather radar reports severe whiteout conditions and 70 knot wind gusts across high elevation passes.',
  });

  const OVERRIDE_REASONS = [
    'Severe Local Weather Change',
    'Operational Resource Reallocation',
    'Military Priority Convoy Has Right of Way',
    'Unreported Road Clearance Verified by Ground Patrol',
    'Alternative Feeder Route Designated by District Magistrate',
    'Other Operator Discretion',
  ];

  // Show Toast Helper
  const showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  // Load existing active emergency mission on mount
  useEffect(() => {
    async function loadActiveMission() {
      try {
        const res = await authFetch('/api/v1/emergency/missions');
        if (res.ok) {
          const json = await res.json();
          const missions: EmergencyResult[] = json.data?.missions || json.missions || [];
          if (missions.length > 0) {
            const active = missions[0];
            setResult(active);
            setActiveMission(active);
            setActiveEmergencyCount(json.data?.activeCount || 1);
            setModifyForm((prev) => ({
              ...prev,
              priority: (active.priority_level as Priority) || 'CRITICAL',
              corridor: active.corridor_affected || '',
              cargoType: form.cargo_type,
              destination: form.destination_id,
            }));
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        setInitialLoading(false);
      }
    }
    loadActiveMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dispatch & Optimize Mission
  async function dispatch() {
    setLoading(true);
    try {
      const res = await authFetch('/api/v1/emergency/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      const newMission: EmergencyResult = json?.data || json;
      setResult(newMission);
      setActiveMission(newMission);
      setActiveEmergencyCount(1);
      setModifyForm((prev) => ({
        ...prev,
        priority: (newMission.priority_level as Priority) || 'CRITICAL',
        corridor: newMission.corridor_affected || '',
      }));
      showToast(`Mission ${newMission.mission_id} generated. Priority score: ${newMission.mission_priority_score}/100.`, 'info');
    } catch {
      showToast('Failed to optimize mission. Please check connectivity.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Accept Plan Workflow (Section 2)
  async function handleAcceptPlan() {
    if (!result) return;
    if (result.status === 'ACCEPTED') {
      showToast(`Mission ${result.mission_id} has already been accepted at ${result.accepted_at}.`, 'warning');
      return;
    }

    try {
      const res = await authFetch(`/api/v1/emergency/missions/${result.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to accept plan', 'error');
        return;
      }

      const updated = json.data;
      setResult(updated);
      setActiveMission(updated);
      showToast(`Emergency response plan ${result.mission_id} accepted. Downstream convoy clearance active.`, 'success');
    } catch (err) {
      showToast('Network error while accepting plan.', 'error');
    }
  }

  // Modify Plan Workflow (Section 3)
  async function handleSaveModification() {
    if (!result) return;
    try {
      const res = await authFetch(`/api/v1/emergency/missions/${result.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify',
          priority: modifyForm.priority,
          corridor: modifyForm.corridor,
          transportMode: modifyForm.transportMode,
          cargoType: modifyForm.cargoType,
          destination: modifyForm.destination,
          notes: modifyForm.notes,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to modify plan', 'error');
        return;
      }

      const updated = json.data;
      setResult(updated);
      setActiveMission(updated);
      setModifyOpen(false);
      showToast(`Mission ${result.mission_id} updated and recalculated by operator.`, 'success');
    } catch {
      showToast('Network error while saving modifications.', 'error');
    }
  }

  // Override Plan Workflow (Section 4)
  async function handleConfirmOverride() {
    if (!result) return;
    if (!overrideForm.reason || !overrideForm.decision) {
      showToast('Please provide both override reason and operator decision.', 'warning');
      return;
    }

    try {
      const res = await authFetch(`/api/v1/emergency/missions/${result.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'override',
          reason: overrideForm.reason,
          decision: overrideForm.decision,
          justification: overrideForm.justification,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to override plan', 'error');
        return;
      }

      const updated = json.data;
      setResult(updated);
      setActiveMission(updated);
      setOverrideOpen(false);
      showToast(`AI recommendation overridden by operator. Status: OVERRIDDEN.`, 'warning');
    } catch {
      showToast('Network error while applying manual override.', 'error');
    }
  }

  // Execute Individual Action (Section 5)
  async function handleExecuteAction(action: EmergencyAction) {
    if (!result) return;
    try {
      const res = await authFetch(`/api/v1/emergency/missions/${result.mission_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_action',
          actionId: action.id,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast(json.error?.message || 'Failed to execute action', 'error');
        return;
      }

      const { mission: updatedMission, notice, isExternalAgency } = json.data;
      setResult(updatedMission);
      setActiveMission(updatedMission);

      setActionNoticeModal({
        open: true,
        title: action.title,
        notice,
        isExternal: Boolean(isExternalAgency),
      });
    } catch {
      showToast('Network error executing emergency action.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center justify-between shadow-xl text-sm font-semibold border ${
              toast.type === 'success'
                ? 'bg-safe/20 border-safe/40 text-safe-light'
                : toast.type === 'warning'
                ? 'bg-amber/20 border-amber/40 text-amber-light'
                : toast.type === 'error'
                ? 'bg-danger/20 border-danger/40 text-danger-light'
                : 'bg-teal/20 border-teal/40 text-teal-light'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'error' && <ShieldAlert size={20} />}
              {toast.type === 'info' && <Info size={20} />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
            <Siren size={28} className="text-danger" /> Emergency Mission Command
          </h1>
          <p className="text-mist-muted text-sm mt-1">
            Priority tactical response, multimodal rescue corridors, and inter-agency dispatch
          </p>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuditLogOpen((v) => !v)}
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-mist flex items-center gap-2 transition-all"
            >
              <History size={15} /> Audit Log ({result.audit_log?.length || 1})
            </button>
          </div>
        )}
      </div>

      {/* High-Impact Safety Warning Banner (Section 14) */}
      <div className="p-3.5 rounded-xl bg-danger/[0.08] border border-danger/25 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-danger animate-pulse flex-shrink-0" />
          <span className="text-xs sm:text-sm text-danger-light font-medium">
            <strong>Emergency Mode Active</strong> — AI-generated recommendation — verify with authorized authorities before real-world deployment.
          </span>
        </div>
        <span className="hidden md:inline-block text-[0.65rem] uppercase tracking-wider font-bold bg-danger/20 text-danger-light px-2.5 py-1 rounded">
          PROTOCOL NDMA-04
        </span>
      </div>

      {/* Main Grid: Form & Result Panel */}
      <div className="grid xl:grid-cols-12 gap-6">
        {/* Mission Setup Form */}
        <div className="xl:col-span-5 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Zap size={18} className="text-amber" /> Mission Parameters
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Mission Type</label>
                  <select
                    value={form.mission_type}
                    onChange={(e) => setForm((f) => ({ ...f, mission_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  >
                    {MISSION_TYPES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL (Cat-1)</option>
                    <option value="HIGH">HIGH (Urgent)</option>
                    <option value="MEDIUM">MEDIUM (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Origin Node</label>
                  <select
                    value={form.origin_id}
                    onChange={(e) => setForm((f) => ({ ...f, origin_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Destination Node</label>
                  <select
                    value={form.destination_id}
                    onChange={(e) => setForm((f) => ({ ...f, destination_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  >
                    {LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}, {l.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Cargo Category</label>
                  <select
                    value={form.cargo_type}
                    onChange={(e) => setForm((f) => ({ ...f, cargo_type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  >
                    {CARGO_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-2">Payload (kg)</label>
                  <input
                    type="number"
                    value={form.cargo_weight_kg}
                    onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm focus:border-danger/50 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={dispatch}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-danger via-amber to-danger text-white font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-danger/30 transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="ai-spinner !w-5 !h-5 !border-2" />
                ) : (
                  <>
                    <Zap size={18} /> Synthesize Emergency Response Plan
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          {/* Audit Trail Drawer / Accordion */}
          {result && auditLogOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <GlassCard className="p-5 border-white/15">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <History size={16} className="text-orchid" /> Immutable Audit Trail
                  </h4>
                  <span className="text-[0.65rem] text-mist-muted font-mono">{result.mission_id}</span>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {(result.audit_log || []).map((entry) => (
                    <div key={entry.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold uppercase tracking-wider ${
                          entry.action === 'ACCEPTED'
                            ? 'text-safe'
                            : entry.action === 'OVERRIDDEN'
                            ? 'text-danger'
                            : entry.action === 'MODIFIED'
                            ? 'text-orchid'
                            : 'text-mist'
                        }`}>
                          {entry.action}
                        </span>
                        <span className="text-[0.65rem] text-mist-muted">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-mist-dim leading-relaxed">{entry.details}</p>
                      <p className="text-[0.65rem] text-mist-muted">Actor: {entry.actor}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Tactical Response Plan Results */}
        <div className="xl:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key={result.mission_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Mission Status Header Card */}
                <GlassCard
                  variant={result.status === 'OVERRIDDEN' ? 'danger' : 'default'}
                  className="p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-mist-muted">{result.mission_id}</span>
                        <Badge
                          variant={
                            result.status === 'ACCEPTED'
                              ? 'LOW'
                              : result.status === 'OVERRIDDEN'
                              ? 'CRITICAL'
                              : result.status === 'MODIFIED'
                              ? 'HIGH'
                              : 'CRITICAL'
                          }
                        >
                          STATUS: {result.status}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-black text-white mt-1">
                        Emergency Plan: {form.cargo_type} ({form.cargo_weight_kg}kg)
                      </h2>
                      <p className="text-xs text-mist-dim mt-0.5">
                        Corridor: {result.corridor_affected || 'Strategic Transport Axis'}
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-white/10 sm:pl-6">
                      <p className="text-xs text-mist-muted mb-1">Priority Index</p>
                      <div className="text-4xl font-black font-mono text-danger">
                        {result.mission_priority_score}
                      </div>
                      <span className="text-[0.65rem] font-bold text-mist-muted uppercase">
                        {result.priority_level} PRIORITY
                      </span>
                    </div>
                  </div>

                  {/* Overridden Notice */}
                  {result.status === 'OVERRIDDEN' && result.override_info && (
                    <div className="mt-4 p-3.5 rounded-lg bg-danger/15 border border-danger/30 text-xs space-y-1">
                      <div className="flex items-center gap-2 text-danger-light font-bold">
                        <AlertTriangle size={15} /> AI Recommendation Overridden by Operator
                      </div>
                      <p className="text-mist-dim">
                        <strong>Reason:</strong> {result.override_info.reason}
                      </p>
                      <p className="text-mist-dim">
                        <strong>Decision:</strong> {result.override_info.decision}
                      </p>
                      <p className="text-[0.65rem] text-mist-muted">
                        Operator: {result.override_info.operator} • {new Date(result.override_info.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Action Bar (Accept, Modify, Override) */}
                  <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-3">
                    {/* Accept Plan Button (Section 2) */}
                    <button
                      onClick={handleAcceptPlan}
                      disabled={result.status === 'ACCEPTED'}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                        result.status === 'ACCEPTED'
                          ? 'bg-safe/20 border border-safe/40 text-safe cursor-default'
                          : 'bg-safe text-white hover:bg-safe/90 hover:shadow-lg hover:shadow-safe/30'
                      }`}
                    >
                      <CheckCircle2 size={17} />
                      {result.status === 'ACCEPTED' ? 'Plan Accepted & Logged' : 'Accept Plan'}
                    </button>

                    {/* Modify Button (Section 3) */}
                    <button
                      onClick={() => setModifyOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber/15 border border-amber/30 text-amber-light text-xs sm:text-sm font-semibold hover:bg-amber/25 transition-all flex items-center gap-2"
                    >
                      <Edit3 size={15} /> Modify
                    </button>

                    {/* Override Button (Section 4) */}
                    <button
                      onClick={() => setOverrideOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-danger/15 border border-danger/30 text-danger-light text-xs sm:text-sm font-semibold hover:bg-danger/25 transition-all flex items-center gap-2"
                    >
                      <ShieldAlert size={15} /> Override
                    </button>
                  </div>
                </GlassCard>

                {/* Recommended Vehicle Card */}
                {result.recommended_vehicle && (
                  <GlassCard className="p-5">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Truck size={17} className="text-teal" /> Tactical Transport Allocation
                    </h3>
                    <div className="p-3.5 rounded-xl bg-teal/[0.06] border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold font-mono text-white">
                            {result.recommended_vehicle.id}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-teal/20 text-teal-light font-bold">
                            {result.recommended_vehicle.type}
                          </span>
                        </div>
                        <p className="text-xs text-mist-dim mt-1">
                          Capacity: {result.recommended_vehicle.capacityTons} Tons • Driver: {result.recommended_vehicle.driver}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-safe">
                          Fuel Reserve: {result.recommended_vehicle.fuelPct}%
                        </span>
                        <p className="text-[0.65rem] text-mist-muted mt-0.5">
                          Tolerance: {result.recommended_vehicle.riskTolerance}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Structured Recommendations / Real Emergency Mission Workflow (Section 1 & 5) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Radio size={18} className="text-orchid" /> Recommended Response Actions ({result.actions?.length || 0})
                    </h3>
                    <span className="text-xs text-mist-muted">
                      Source: {result.data_source || 'AuraNER Intelligence'}
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {(result.actions || []).map((action) => (
                      <div
                        key={action.id}
                        className={`p-4 rounded-xl border transition-all ${
                          action.status === 'ACCEPTED'
                            ? 'bg-safe/[0.04] border-safe/30'
                            : action.status === 'EXECUTING'
                            ? 'bg-orchid/[0.06] border-orchid/40'
                            : action.status === 'OVERRIDDEN'
                            ? 'bg-danger/[0.04] border-danger/25 opacity-75'
                            : 'bg-[#0E1712] border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Action Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white flex-shrink-0">
                              {action.id}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white leading-snug">
                                {action.title}
                              </h4>
                              <p className="text-xs text-mist-dim mt-1 leading-relaxed">
                                {action.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 self-start">
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded ${
                              action.severity === 'SEVERE'
                                ? 'bg-danger/20 text-danger-light'
                                : action.severity === 'HIGH'
                                ? 'bg-amber/20 text-amber-light'
                                : 'bg-teal/20 text-teal-light'
                            }`}>
                              {action.severity}
                            </span>
                            <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded ${
                              action.status === 'ACCEPTED'
                                ? 'bg-safe/20 text-safe-light'
                                : action.status === 'EXECUTING'
                                ? 'bg-orchid/20 text-orchid-light'
                                : action.status === 'OVERRIDDEN'
                                ? 'bg-danger/20 text-danger-light'
                                : 'bg-white/10 text-mist-dim'
                            }`}>
                              {action.status}
                            </span>
                          </div>
                        </div>

                        {/* Action Details Grid */}
                        <div className="mt-3.5 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[0.65rem] text-mist-muted block">Corridor / Axis:</span>
                            <span className="text-mist font-medium">{action.corridor}</span>
                          </div>
                          <div>
                            <span className="text-[0.65rem] text-mist-muted block">Responsible Agency:</span>
                            <span className="text-mist font-medium">{action.responsibleAgency}</span>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-[0.65rem] text-mist-muted block">Reasoning &amp; Impact:</span>
                            <p className="text-mist-dim leading-normal">{action.reason} {action.impact}</p>
                          </div>
                        </div>

                        {/* Resources Required */}
                        {action.resources && action.resources.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[0.65rem] text-mist-muted mr-1">Resources:</span>
                            {action.resources.map((res, idx) => (
                              <span
                                key={idx}
                                className="text-[0.65rem] px-2 py-0.5 rounded bg-forest-200/80 border border-white/10 text-mist"
                              >
                                {res}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Execution Footer (Section 5) */}
                        <div className="mt-3.5 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-[0.65rem] text-mist-muted">
                            Confidence: <strong>{Math.round(action.confidence * 100)}%</strong> • Source: {action.source}
                          </div>

                          <button
                            onClick={() => handleExecuteAction(action)}
                            disabled={action.status === 'OVERRIDDEN'}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                              action.status === 'EXECUTING'
                                ? 'bg-orchid/20 text-orchid-light border border-orchid/40'
                                : action.status === 'ACCEPTED'
                                ? 'bg-safe/20 text-safe-light border border-safe/40 hover:bg-safe/30'
                                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                            }`}
                          >
                            <Send size={13} />
                            {action.status === 'EXECUTING' ? 'Action Executing' : 'Execute Action'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <GlassCard className="p-12 text-center">
                <Siren size={36} className="text-danger/40 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Active Emergency Mission Selected</h3>
                <p className="text-mist-muted text-xs mt-1 max-w-sm mx-auto">
                  Configure mission parameters on the left and click &ldquo;Synthesize Emergency Response Plan&rdquo; to generate actionable contingency routing.
                </p>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODIFY MODAL / DRAWER (Section 3)                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {modifyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0B130F] border border-white/15 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Edit3 size={20} className="text-amber" />
                  <h3 className="text-lg font-bold text-white">Modify Emergency Mission Plan</h3>
                </div>
                <button onClick={() => setModifyOpen(false)} className="text-mist-muted hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-mist-dim mb-1.5">Priority Override</label>
                    <select
                      value={modifyForm.priority}
                      onChange={(e) => setModifyForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                      className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-mist-dim mb-1.5">Transport Mode</label>
                    <select
                      value={modifyForm.transportMode}
                      onChange={(e) => setModifyForm((f) => ({ ...f, transportMode: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                    >
                      <option value="ROAD">Road Surface Convoy</option>
                      <option value="AIR_HELICOPTER">Tactical Helicopter Sortie</option>
                      <option value="MULTIMODAL">Multimodal (Waterway + Road)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-1.5">Affected Highway Corridor</label>
                  <input
                    type="text"
                    value={modifyForm.corridor}
                    onChange={(e) => setModifyForm((f) => ({ ...f, corridor: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-mist-dim mb-1.5">Destination Node</label>
                    <select
                      value={modifyForm.destination}
                      onChange={(e) => setModifyForm((f) => ({ ...f, destination: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                    >
                      {LOCATIONS.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}, {l.state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-mist-dim mb-1.5">Estimated Departure</label>
                    <input
                      type="text"
                      value={modifyForm.departureTime}
                      onChange={(e) => setModifyForm((f) => ({ ...f, departureTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-1.5">Required Resources &amp; Equipment</label>
                  <input
                    type="text"
                    value={modifyForm.resources}
                    onChange={(e) => setModifyForm((f) => ({ ...f, resources: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-1.5">Response Agencies</label>
                  <input
                    type="text"
                    value={modifyForm.agencies}
                    onChange={(e) => setModifyForm((f) => ({ ...f, agencies: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist-dim mb-1.5">Operator Notes &amp; Directives</label>
                  <textarea
                    rows={3}
                    value={modifyForm.notes}
                    onChange={(e) => setModifyForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setModifyOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-mist hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModification}
                  className="px-5 py-2.5 rounded-xl bg-amber text-forest-900 font-bold text-xs hover:bg-amber-light transition-all"
                >
                  Save Changes &amp; Recalculate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. OVERRIDE MODAL (Section 4)                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {overrideOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-[#14080A] border border-danger/40 shadow-2xl p-6"
            >
              <div className="flex items-center gap-3 text-danger mb-3">
                <ShieldAlert size={24} />
                <h3 className="text-lg font-bold text-white">Override AI Recommendation?</h3>
              </div>

              <p className="text-xs text-mist-dim leading-relaxed mb-4">
                Manual override will replace the AI-generated response plan with an operator-defined decision. This action is permanently audited in the incident log.
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-mist mb-1.5">Override Reason *</label>
                  <select
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                  >
                    {OVERRIDE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist mb-1.5">New Operator Decision *</label>
                  <input
                    type="text"
                    value={overrideForm.decision}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, decision: e.target.value }))}
                    placeholder="Enter explicit operational directive..."
                    className="w-full px-3 py-2.5 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-mist mb-1.5">Operational Justification</label>
                  <textarea
                    rows={3}
                    value={overrideForm.justification}
                    onChange={(e) => setOverrideForm((f) => ({ ...f, justification: e.target.value }))}
                    placeholder="Ground telemetry or reconnaissance details..."
                    className="w-full px-3 py-2 rounded-lg bg-forest-200/80 border border-white/10 text-white text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setOverrideOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-mist hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOverride}
                  className="px-5 py-2.5 rounded-xl bg-danger text-white font-bold text-xs hover:bg-danger-dark transition-all shadow-lg shadow-danger/30"
                >
                  Confirm Manual Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. ACTION EXECUTION NOTICE MODAL (Section 5)                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {actionNoticeModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-[#0B130F] border border-white/20 shadow-2xl p-6 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-orchid/20 text-orchid flex items-center justify-center mx-auto mb-3">
                <Send size={24} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{actionNoticeModal.title}</h3>

              <div className={`p-4 rounded-xl text-xs text-left leading-relaxed mb-5 ${
                actionNoticeModal.isExternal
                  ? 'bg-amber/[0.08] border border-amber/30 text-amber-light'
                  : 'bg-safe/[0.08] border border-safe/30 text-safe-light'
              }`}>
                {actionNoticeModal.notice}
              </div>

              {actionNoticeModal.isExternal && (
                <p className="text-[0.68rem] text-mist-muted mb-4">
                  Note: The system coordinates internal routing variables immediately. Live automatic telemetry dispatch with external military or state authorities requires credentialed agency API gateway keys.
                </p>
              )}

              <button
                onClick={() => setActionNoticeModal(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
              >
                Acknowledge Directive
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
