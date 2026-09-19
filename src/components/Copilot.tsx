'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Brain, X, Send, Sparkles } from 'lucide-react';

interface Message { role: 'user' | 'ai'; text: string; actions?: { label: string; target?: string }[] }

const SUGGESTIONS = [
  'Which routes are risky right now?',
  'Show accessibility bottlenecks',
  'Fleet status overview',
  'Where to pre-position supplies?',
];

export default function Copilot() {
  const { copilotOpen, setCopilotOpen, toggleCopilot } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: '👋 I\'m your NER logistics AI copilot. Ask me about routes, risk, accessibility, fleet status, or supply positioning.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(query?: string) {
    const q = query || input.trim();
    if (!q) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const token = localStorage.getItem('ner_token') || '';
      const res = await fetch('/api/copilot/query', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response || 'No response.', actions: data.actions }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I couldn\'t process that query. Try again.' }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* FAB */}
      {!copilotOpen && (
        <button onClick={toggleCopilot}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orchid to-teal text-white rounded-2xl px-5 py-3 flex items-center gap-2 shadow-lg shadow-orchid/30 hover:scale-105 transition-transform">
          <Brain size={22} /><span className="font-semibold text-sm">AI Copilot</span>
        </button>
      )}

      {/* Panel */}
      <AnimatePresence>
        {copilotOpen && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] z-50 glass-heavy flex flex-col border-l border-white/[0.08]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-orchid" />
                <span className="font-bold text-white">AI Copilot</span>
                <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                <span className="text-[0.6rem] bg-orchid/20 text-orchid-light px-2 py-0.5 rounded">BETA</span>
              </div>
              <button onClick={toggleCopilot} className="text-mist-muted hover:text-white transition-colors"><X size={20} /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${m.role === 'ai' ? 'bg-orchid/[0.08] border border-orchid/[0.15] text-mist' : 'bg-teal/[0.12] border border-teal/20 text-mist'}`}>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.actions.map((a, j) => (
                          <a key={j} href={`/${a.target || ''}`}
                            className="text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-mist-dim hover:bg-orchid/10 hover:text-orchid-light transition-colors">
                            {a.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex"><div className="bg-orchid/[0.08] border border-orchid/[0.15] rounded-xl px-4 py-3 text-sm text-mist-muted">Analyzing...</div></div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-mist-dim hover:bg-orchid/10 hover:text-orchid-light transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 p-4 border-t border-white/[0.06]">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about routes, risk, fleet..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-forest-200/60 border border-white/10 text-white text-sm placeholder-mist-muted focus:border-orchid/50 focus:outline-none" />
              <button onClick={() => send()} className="bg-orchid rounded-lg px-3 text-white hover:bg-orchid-dark transition-colors"><Send size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
