'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import TerrainCanvas from '@/components/landing/TerrainCanvas';
import {
  Mountain,
  Truck,
  Package,
  Route as RouteIcon,
  ShieldAlert,
  Map as MapIcon,
  Radio,
  Brain,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Globe2,
  Activity,
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Truck,
    title: 'Fleet Management',
    desc: 'Centralized registry and operational management of transport assets, vehicle capability ratings, and regional driver assignments across all 8 Northeastern states.',
    color: 'text-teal bg-teal/10 border-teal/20',
  },
  {
    icon: Package,
    title: 'Shipment Management',
    desc: 'Multi-stop manifest tracking, emergency relief prioritization, cargo validation, and end-to-end chain of custody auditing for civil supplies and medical logistics.',
    color: 'text-orchid bg-orchid/10 border-orchid/20',
  },
  {
    icon: RouteIcon,
    title: 'Route Intelligence',
    desc: 'Mountain-aware route optimization calculating road surface quality, elevation gradients, bridge weight capacities, and weather-impacted transit times.',
    color: 'text-safe bg-safe/10 border-safe/20',
  },
  {
    icon: ShieldAlert,
    title: 'Risk & Hazard Forecasting',
    desc: 'Continuous ingestion of rainfall radar, geological landslide vulnerability models, and flood inundation warnings to flag corridor hazards before convoys depart.',
    color: 'text-amber bg-amber/10 border-amber/20',
  },
  {
    icon: MapIcon,
    title: 'Accessibility Intelligence',
    desc: 'Multi-factor accessibility indices identifying remote community isolation risks, single-access-road dependencies, and strategic safe-haven staging hubs.',
    color: 'text-teal-light bg-teal/10 border-teal/20',
  },
  {
    icon: Radio,
    title: 'Real-Time Telemetry & Tracking',
    desc: 'Continuous GPS telemetry ingestion with dead-reckoning support for low-connectivity valleys, automatic stop detection, and geofenced transit monitoring.',
    color: 'text-orchid-light bg-orchid/10 border-orchid/20',
  },
  {
    icon: Brain,
    title: 'AI-Assisted Dispatch Copilot',
    desc: 'Automated detour synthesis and hazard analysis with mandatory human dispatcher approval gates, preventing hallucinations while accelerating emergency replanning.',
    color: 'text-orchid bg-orchid/10 border-orchid/20',
  },
  {
    icon: Layers,
    title: 'Multi-Tenancy & Spatial Isolation',
    desc: 'Strict organization-level data boundaries with state-level partitioning, ensuring civil supply departments and relief agencies maintain sovereign data governance.',
    color: 'text-safe bg-safe/10 border-safe/20',
  },
];

const SECURITY_PILLARS = [
  {
    icon: Lock,
    title: 'Cryptographic Authentication',
    desc: 'Firebase RS256 token verification against Google public JWKS keys, paired with HTTP-Only secure session cookies.',
  },
  {
    icon: ShieldCheck,
    title: 'Granular Role-Based Access Control',
    desc: 'Strict authorization across 5 operational roles: Dispatcher, Logistics Manager, Driver, Organization Admin, and Viewer.',
  },
  {
    icon: Cpu,
    title: 'Audit & Provenance Logging',
    desc: 'Immutable audit trails for state mutations, routing decisions, detour approvals, and emergency cargo dispatches.',
  },
  {
    icon: Globe2,
    title: 'Hardened Network Security',
    desc: 'Strict Content Security Policy (CSP), origin-validated CORS, CSRF request origin verification, and rate limiting.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080C0A] text-[#F8FAFC] selection:bg-orchid selection:text-white overflow-x-hidden">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#080C0A]/85 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white shadow-lg shadow-orchid/20 group-hover:scale-105 transition-transform">
              <Mountain className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none text-white">
                NER-Route<span className="text-teal">AI</span>
              </span>
              <span className="text-[0.65rem] font-bold text-mist-muted tracking-widest uppercase mt-0.5">
                Logistics Command Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-mist hover:text-white transition-colors">
            <a href="#capabilities" className="hover:text-teal transition-colors">Platform Capabilities</a>
            <a href="#security" className="hover:text-teal transition-colors">Security Architecture</a>
            <a href="#coverage" className="hover:text-teal transition-colors">Regional Scope</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10 hover:border-white/40 transition-all focus:outline-none focus:ring-2 focus:ring-teal"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal to-orchid hover:opacity-95 text-xs font-bold text-white shadow-md shadow-teal/25 hover:shadow-teal/40 transition-all focus:outline-none focus:ring-2 focus:ring-orchid"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Topographic Terrain Canvas (Theme: Borders of Nature & Tech) */}
        <TerrainCanvas />

        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.15, 0.22, 0.15],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-orchid/20 to-teal/20 blur-[120px] rounded-full"
          />
        </div>

        <div className="text-center max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-teal/10 border border-teal/25 text-teal text-xs font-bold mb-6"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
            </span>
            <span>Enterprise Logistics Command &amp; Route Safety Intelligence</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]"
          >
            Critical Supply Corridors &amp; Routing Intelligence for{' '}
            <span className="bg-gradient-to-r from-teal via-orchid-light to-orchid bg-clip-text text-transparent">
              Northeast India
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-mist-dim leading-relaxed max-w-2xl mx-auto"
          >
            A unified logistics operating platform purpose-built for rugged mountain geography, monsoon disruptions, and high-priority civil supply distribution across Northeast India.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-teal to-orchid hover:opacity-95 text-sm font-bold text-white shadow-lg shadow-teal/30 hover:shadow-teal/50 hover:scale-[1.02] flex items-center justify-center gap-2.5 transition-all group focus:outline-none focus:ring-2 focus:ring-teal"
            >
              <span>Get Started</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0B130F] hover:bg-[#14221B] border border-white/20 hover:border-orchid/40 text-sm font-bold text-white transition-all hover:scale-[1.02] flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-orchid"
            >
              <span>Sign In to Platform</span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-medium text-mist-muted"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal" />
              <span>Multi-Tenant Agency Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal" />
              <span>Cryptographic Session Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal" />
              <span>Terrain &amp; Weather-Aware Routing</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Platform Capabilities Grid */}
      <section id="capabilities" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Comprehensive Logistics Command Capabilities
          </h2>
          <p className="text-mist-dim text-sm sm:text-base mt-3 leading-relaxed">
            Engineered to replace fragmented manual tracking with synchronized operational intelligence across dispatchers, fleet managers, and drivers.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-2xl bg-[#0E1712] border border-white/10 p-6 flex flex-col justify-between hover:border-teal/40 transition-colors group cursor-default shadow-sm hover:shadow-lg hover:shadow-teal/5"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-5 ${cap.color} group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-teal transition-colors">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-mist-dim mt-2.5 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 4. Security & Compliance Architecture */}
      <section id="security" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orchid/10 border border-orchid/30 text-orchid-light text-xs font-bold mb-4">
              <ShieldCheck size={14} />
              Enterprise Security Standards
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Built for Government, Military Logistics &amp; Emergency Supply Chains
            </h2>
            <p className="text-mist-dim text-sm sm:text-base mt-4 leading-relaxed">
              NER-Route AI is architected with strict access controls, verified token signatures, and defense-in-depth measures to protect critical state logistics operations.
            </p>

            <div className="mt-8 space-y-4">
              {SECURITY_PILLARS.map((sec, idx) => {
                const SecIcon = sec.icon;
                return (
                  <motion.div
                    key={sec.title}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    whileHover={{ x: 2, transition: { duration: 0.15 } }}
                    className="flex items-start gap-3.5 p-4 rounded-xl bg-[#0E1712] border border-white/10 hover:border-white/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0 mt-0.5">
                      <SecIcon size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{sec.title}</h4>
                      <p className="text-xs text-mist-dim mt-1 leading-relaxed">{sec.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-[#0E1712] rounded-3xl border border-white/10 p-8 flex flex-col justify-center space-y-6"
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity size={20} className="text-teal" />
              Operational Architecture Highlights
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                <div className="text-xs font-bold text-teal">Autonomous Detour Agent</div>
                <p className="text-xs text-mist-dim mt-1 leading-relaxed">
                  LangGraph workflow evaluates blocked road nodes and generates safe haven stops, halting strictly at a human approval gate before routes are applied.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                <div className="text-xs font-bold text-orchid">Multi-State Geographic Partitioning</div>
                <p className="text-xs text-mist-dim mt-1 leading-relaxed">
                  PostgreSQL PostGIS topology models specifically adapted for the 8 sister states: Assam, Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors">
                <div className="text-xs font-bold text-safe">Offline Driver Synchronization</div>
                <p className="text-xs text-mist-dim mt-1 leading-relaxed">
                  Field driver workflows support offline queueing of waypoints and delivery receipts, automatically syncing upon re-entering cellular coverage.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-teal"
              >
                Access Secure Portal
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Regional Scope */}
      <section id="coverage" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Eight-State Regional Logistics Network
          </h2>
          <p className="text-mist-dim text-sm mt-3">
            Unified corridor intelligence tailored for the unique geographical and meteorological conditions of Northeast India.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { state: 'Assam', desc: 'Brahmaputra Valley & River Corridors' },
            { state: 'Arunachal Pradesh', desc: 'High-Altitude Himalayan Transit' },
            { state: 'Meghalaya', desc: 'Monsoon Plateau & Heavy Rainfall Routes' },
            { state: 'Manipur', desc: 'Imphal Valley & Mountain Passes' },
            { state: 'Mizoram', desc: 'Ridge Roads & Southern Arteries' },
            { state: 'Nagaland', desc: 'Steep Hill Corridors & Arterial Links' },
            { state: 'Tripura', desc: 'Border Transits & Plain Connections' },
            { state: 'Sikkim', desc: 'Alpine & Border Supply Corridors' },
          ].map((item, idx) => (
            <motion.div
              key={item.state}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="p-4 rounded-xl bg-[#0E1712] border border-white/10 hover:border-teal/30 transition-colors"
            >
              <div className="text-sm font-black text-white">{item.state}</div>
              <div className="text-[0.7rem] text-mist-muted mt-1 leading-tight">{item.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. Call to Action Banner */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-to-r from-orchid/20 via-forest to-teal/20 border border-white/15 p-8 sm:p-12 text-center relative overflow-hidden"
        >
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ready to Coordinate Northeast Logistics?
          </h2>
          <p className="text-mist-dim text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Create an organization account or sign in with your enterprise credentials to access the live command dispatch dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-teal to-orchid hover:opacity-95 text-sm font-bold text-white shadow-lg shadow-teal/25 transition-all focus:outline-none focus:ring-2 focus:ring-teal"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#080C0A] hover:bg-[#14221B] border border-white/25 text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-orchid"
            >
              Sign In
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 7. Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-white/[0.08] bg-[#060907]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orchid to-teal flex items-center justify-center text-white">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-white">NER-Route<span className="text-teal">AI</span></span>
              <p className="text-[0.65rem] text-mist-muted">Northeast Logistics Intelligence &amp; Dispatch Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-mist-dim">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Create Account</Link>
            <a href="#capabilities" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>

          <div className="text-center sm:text-right text-[0.7rem] text-mist-muted">
            &copy; {new Date().getFullYear()} NER-Route AI Platform. Enterprise Security Architecture.
          </div>
        </div>
      </footer>
    </div>
  );
}
