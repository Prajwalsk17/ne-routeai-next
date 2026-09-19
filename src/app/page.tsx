'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Map, Route, ShieldAlert, Brain, Truck, BarChart3, Zap, Radio, CloudRain, Mountain } from 'lucide-react';

const features = [
  { icon: Route, title: 'Smart Route AI', desc: 'Multi-criteria route optimization with terrain, weather, and disaster awareness.', color: 'text-orchid bg-orchid/10' },
  { icon: ShieldAlert, title: 'Predictive Risk Intel', desc: 'Landslide, flood, and road disruption forecasting with seasonal models.', color: 'text-teal bg-teal/10' },
  { icon: Brain, title: 'AI Copilot', desc: 'Natural language assistant for logistics queries, route explanations, and decisions.', color: 'text-orchid-light bg-orchid/10' },
  { icon: Truck, title: 'Emergency Logistics', desc: 'Priority-scored emergency missions with vehicle selection and rapid dispatch.', color: 'text-danger bg-danger/10' },
  { icon: Map, title: 'Accessibility Intelligence', desc: '6-factor accessibility scoring with gap analysis for remote NER communities.', color: 'text-safe bg-safe/10' },
  { icon: CloudRain, title: 'Disaster Simulator', desc: 'What-if scenario modeling for monsoon, landslide, and infrastructure failures.', color: 'text-amber bg-amber/10' },
];

const stats = [
  { num: '8', label: 'NE States', suffix: '' },
  { num: '25+', label: 'Locations', suffix: '' },
  { num: '6', label: 'AI Engines', suffix: '' },
  { num: '15', label: 'Corridors', suffix: '' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-forest overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass-heavy">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mountain className="w-8 h-8 text-orchid" />
            <span className="text-lg font-extrabold text-white">NER-Route<span className="text-safe">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-mist-dim hover:text-white transition-colors">Features</a>
            <a href="#impact" className="text-sm text-mist-dim hover:text-white transition-colors">Impact</a>
            <Link href="/login" className="px-5 py-2 text-sm font-semibold rounded-lg border border-white/20 text-white hover:bg-white/5 transition-all">Sign In</Link>
            <Link href="/login" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-orchid to-teal text-white shadow-lg shadow-orchid/25 hover:-translate-y-0.5 transition-all">Launch Platform →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orchid/10 border border-orchid/20 text-sm text-orchid-light mb-6">
              <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
              Smart India Hackathon 2024
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
              <span className="gradient-text">AI-Powered</span> Logistics for{' '}
              <span className="text-orchid-light">Northeast India</span>
            </h1>
            <p className="text-lg text-mist-dim mt-6 leading-relaxed max-w-xl">
              Predict the disruption. Optimize the route. Deliver without interruption.
            </p>
            <p className="text-mist-muted mt-3 italic">
              &ldquo;When landslides block the lifeline roads and monsoons flood the valleys, NER-RouteAI finds a way.&rdquo;
            </p>
            <div className="flex gap-4 mt-8">
              <Link href="/login" className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold text-base shadow-lg shadow-orchid/30 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2">
                <Zap size={20} /> Launch Platform
              </Link>
              <Link href="/login" className="px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition-all">
                Live Demo →
              </Link>
            </div>
            <div className="flex gap-10 mt-12">
              {stats.map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-white font-mono">{s.num}{s.suffix}</div>
                  <div className="text-[0.75rem] text-mist-muted uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative hidden lg:block">
            <div className="glass rounded-3xl p-8 relative overflow-hidden">
              {/* Stylized NER Map SVG */}
              <svg viewBox="0 0 400 350" className="w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                {/* NER region outline */}
                <path d="M60,50 Q80,30 120,40 L180,35 Q220,45 260,55 L310,80 Q340,100 350,140 L345,180 Q330,220 300,250 L270,280 Q240,300 200,310 L160,305 Q120,290 90,260 L65,220 Q45,180 50,140 L55,100 Q55,70 60,50 Z" fill="url(#mapGrad)" stroke="#A855F7" strokeWidth="1.5" opacity="0.6" />
                {/* Route lines */}
                <line x1="120" y1="100" x2="250" y2="180" stroke="#A855F7" strokeWidth="2" strokeDasharray="8,4" className="route-line-animated" opacity="0.7" />
                <line x1="180" y1="80" x2="280" y2="220" stroke="#0D9488" strokeWidth="2" strokeDasharray="8,4" className="route-line-animated" opacity="0.7" />
                <line x1="100" y1="200" x2="220" y2="260" stroke="#F59E0B" strokeWidth="2" strokeDasharray="8,4" className="route-line-animated" opacity="0.7" />
                {/* Location dots */}
                {[{x:120,y:100,l:'Guwahati'},{x:250,y:180,l:'Imphal'},{x:180,y:80,l:'Itanagar'},{x:280,y:220,l:'Aizawl'},{x:140,y:160,l:'Shillong'},{x:100,y:200,l:'Agartala'},{x:220,y:130,l:'Dimapur'},{x:80,y:120,l:'Gangtok'}].map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="5" fill="#A855F7" className="animate-marker-pulse" />
                    <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="#A855F7" strokeWidth="1" opacity="0.3" className="animate-pulse-slow" />
                    <text x={p.x + 10} y={p.y + 4} fill="#94A3B8" fontSize="9" fontFamily="Inter">{p.l}</text>
                  </g>
                ))}
                {/* Moving vehicle indicators */}
                <circle cx="170" cy="130" r="4" fill="#22C55E">
                  <animateMotion dur="4s" repeatCount="indefinite" path="M0,0 L60,40 L30,60" />
                </circle>
                <circle cx="200" cy="200" r="4" fill="#F59E0B">
                  <animateMotion dur="5s" repeatCount="indefinite" path="M0,0 L-40,30 L-20,50" />
                </circle>
              </svg>
              {/* Status cards */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border-l-[3px] border-safe flex items-center gap-2">
                  <Radio size={14} className="text-safe" /><span className="text-[0.7rem] text-white">12 Active Routes</span>
                </div>
                <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 border-l-[3px] border-amber flex items-center gap-2">
                  <ShieldAlert size={14} className="text-amber" /><span className="text-[0.7rem] text-white">3 Risk Alerts</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white">Powered by <span className="gradient-text">6 AI Engines</span></h2>
          <p className="text-mist-dim mt-3">Purpose-built for Northeast India&apos;s unique terrain, weather, and accessibility challenges</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-glass p-7 hover:-translate-y-1 hover:border-orchid/20 transition-all duration-300">
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center`}>
                <f.icon size={24} />
              </div>
              <h3 className="text-[1.1rem] font-bold text-white mt-4">{f.title}</h3>
              <p className="text-sm text-mist-dim mt-2 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Impact */}
      <section id="impact" className="py-20 px-6 bg-orchid/[0.03]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white">Regional Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {[
              { n: '40%', l: 'Faster Route Planning', s: 'vs. manual logistics' },
              { n: '65%', l: 'Risk Prediction Accuracy', s: 'multi-factor model' },
              { n: '3x', l: 'Emergency Response', s: 'faster dispatch' },
              { n: '8', l: 'NE States Covered', s: 'complete regional intelligence' },
            ].map(d => (
              <motion.div key={d.l} whileInView={{ scale: [0.9, 1] }} viewport={{ once: true }} className="glass rounded-glass p-8">
                <div className="text-4xl font-black font-mono gradient-text">{d.n}</div>
                <div className="text-sm font-semibold text-white mt-2">{d.l}</div>
                <div className="text-[0.7rem] text-mist-muted mt-1">{d.s}</div>
              </motion.div>
            ))}
          </div>
          <p className="text-mist-muted text-xs mt-8 italic">Projected impact metrics</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-mist-dim italic leading-relaxed">&ldquo;In a region where 70% of roads become inaccessible during monsoon, every routing decision is a life-or-death calculation. NER-RouteAI transforms that calculation from guesswork to intelligence.&rdquo;</p>
          <div className="flex justify-center gap-4 mt-8">
            <Link href="/login" className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-orchid to-teal text-white font-bold shadow-lg shadow-orchid/30 hover:-translate-y-0.5 transition-all">
              Launch Platform →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Mountain className="w-6 h-6 text-orchid" />
            <span className="font-extrabold text-white">NER-Route<span className="text-safe">AI</span></span>
            <span className="text-mist-muted text-xs ml-2">Smart India Hackathon 2024</span>
          </div>
          <p className="text-mist-muted text-xs">Built with AI for Northeast India&apos;s communities</p>
        </div>
      </footer>
    </div>
  );
}
