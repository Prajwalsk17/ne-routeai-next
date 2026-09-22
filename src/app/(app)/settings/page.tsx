'use client';

import React, { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { useOrganization } from '@/components/auth/OrganizationContext';
import { normalizeRole } from '@/lib/auth/roles';
import {
  Settings,
  Mountain,
  Database,
  Shield,
  Cpu,
  User,
  Building,
  Bell,
  LogOut,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useStore();
  const { activeOrganization } = useOrganization();

  const canonicalRole = user?.role ? normalizeRole(user.role) : 'VIEWER';
  const roleDisplay = canonicalRole.replace(/_/g, ' ');

  // Preferences with localStorage persistence
  const [prefInAppAlerts, setPrefInAppAlerts] = useState(true);
  const [prefCriticalEmergency, setPrefCriticalEmergency] = useState(true);
  const [prefAudioCues, setPrefAudioCues] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const inApp = localStorage.getItem('pref_in_app_alerts');
      const critical = localStorage.getItem('pref_critical_emergency');
      const audio = localStorage.getItem('pref_audio_cues');

      if (inApp !== null) setPrefInAppAlerts(inApp === 'true');
      if (critical !== null) setPrefCriticalEmergency(critical === 'true');
      if (audio !== null) setPrefAudioCues(audio === 'true');
    }
  }, []);

  const handleTogglePreference = (
    key: 'inApp' | 'critical' | 'audio',
    currentVal: boolean
  ) => {
    const nextVal = !currentVal;
    if (key === 'inApp') {
      setPrefInAppAlerts(nextVal);
      localStorage.setItem('pref_in_app_alerts', String(nextVal));
    } else if (key === 'critical') {
      setPrefCriticalEmergency(nextVal);
      localStorage.setItem('pref_critical_emergency', String(nextVal));
    } else if (key === 'audio') {
      setPrefAudioCues(nextVal);
      localStorage.setItem('pref_audio_cues', String(nextVal));
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-extrabold text-white flex items-center gap-3">
          <Settings size={28} className="text-mist-dim" /> Platform Settings
        </h1>
        <p className="text-mist-muted text-sm mt-1">
          Identity, organization profile, alert preferences, and engine telemetry
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* User Profile & Organization */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="text-orchid" size={20} />
            <h3 className="text-base font-bold text-white">Identity &amp; Tenant</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-mist-dim">Full Name</span>
              <span className="text-white font-semibold">{user?.name || 'Authorized Operator'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-mist-dim">Authenticated Email</span>
              <span className="text-white font-mono text-xs">{user?.email || 'authenticated@session.gov.in'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
              <span className="text-mist-dim">System Role</span>
              <Badge variant="LOW">{roleDisplay}</Badge>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-mist-dim">Organization Domain</span>
              <span className="text-teal font-semibold flex items-center gap-1.5">
                <Building size={14} />
                {activeOrganization?.name || user?.organizationId || 'org-assam-logistics'}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Notification Preferences with Persistence */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="text-amber" size={20} />
              <h3 className="text-base font-bold text-white">Alert Preferences</h3>
            </div>
            {saveSuccess && (
              <span className="text-xs text-safe flex items-center gap-1">
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <div>
                <p className="text-sm font-semibold text-white">In-App Operational Alerts</p>
                <p className="text-xs text-mist-dim">Receive dispatch and route status notifications</p>
              </div>
              <button
                onClick={() => handleTogglePreference('inApp', prefInAppAlerts)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  prefInAppAlerts ? 'bg-safe' : 'bg-forest-100'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    prefInAppAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <div>
                <p className="text-sm font-semibold text-white">Critical Emergency Broadcasts</p>
                <p className="text-xs text-mist-dim">Immediate alerts for SOS missions and landslide road closures</p>
              </div>
              <button
                onClick={() => handleTogglePreference('critical', prefCriticalEmergency)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  prefCriticalEmergency ? 'bg-danger' : 'bg-forest-100'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    prefCriticalEmergency ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <div>
                <p className="text-sm font-semibold text-white">Audible Audio Cues</p>
                <p className="text-xs text-mist-dim">Sound prompts on route recalculations and urgent alarms</p>
              </div>
              <button
                onClick={() => handleTogglePreference('audio', prefAudioCues)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  prefAudioCues ? 'bg-orchid' : 'bg-forest-100'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    prefAudioCues ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Session Security & Sign Out */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Active Session</h3>
              <p className="text-xs text-mist-dim mt-0.5">Firebase Bearer token active and verified</p>
            </div>
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg bg-danger/10 hover:bg-danger/20 text-danger-light border border-danger/30 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </GlassCard>

        {/* Platform Metadata */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Mountain className="text-orchid" size={20} />
            <h3 className="text-base font-bold text-white">Platform Topology</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-mist-dim">Application</span>
              <span className="text-white font-semibold">NER-Route AI Command Intelligence</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mist-dim">Region Monitored</span>
              <span className="text-mist">Northeast India (8 States)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-mist-dim">Engine Architecture</span>
              <span className="text-mist">Next.js 14 App Router + OSRM + Real Physics</span>
            </div>
          </div>
        </GlassCard>

        {/* AI & Optimization Engines */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="text-teal" size={20} />
            <h3 className="text-base font-bold text-white">Core Engines</h3>
          </div>
          <div className="space-y-2">
            {[
              'Multi-Criteria Route Optimization Engine',
              'Predictive Hazard & Road Risk Engine',
              'Accessibility Intelligence Radar',
              'Emergency Mission SOS Pipeline',
              'Disaster Scenario Simulation Engine',
              'Seasonal Demand Forecasting Engine',
              'AuraNER AI Copilot Reasoning',
            ].map((e) => (
              <div
                key={e}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-sm text-mist">{e}</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                  <span className="text-xs text-safe font-semibold">ONLINE</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
