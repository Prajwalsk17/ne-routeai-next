'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  Brain,
  X,
  Send,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Square,
  AlertTriangle,
  Route,
  ShieldAlert,
  Siren,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { CopilotAction, CopilotCard } from '@/lib/types';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  actions?: CopilotAction[];
  cards?: CopilotCard[];
  provenance?: {
    model?: string;
    provider?: string;
    sourceAttribution?: string;
  };
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  'What is the safest available route from Guwahati to Tawang?',
  'Why did you select this route?',
  'What happens if this road becomes unavailable?',
  'Find an alternative route',
  'Which risks are currently affecting my route?',
  'Explain the risk score',
  'Show me the active emergency missions',
  'Why is this corridor being avoided?',
  'How can I deliver essential cargo to an isolated community?',
  'What transport modes can be used here?',
  'Explain multimodal logistics',
  'What should we do during a landslide?',
];

export default function Copilot() {
  const { copilotOpen, toggleCopilot, setCopilotOpen, activeRoute, activeMission, currentModule } = useStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      role: 'ai',
      text: "👋 I'm your **NER-RouteAI Logistics Copilot**. Ask me about mountain routes, landslide hazards, multimodal transport, active emergency missions, or terrain constraints across Northeast India.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullTextRef = useRef<string>('');
  const activeMessageIdRef = useRef<string>('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Clean up streaming timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, []);

  const stopGeneration = () => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setLoading(false);
    if (activeMessageIdRef.current && fullTextRef.current) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessageIdRef.current
            ? { ...m, text: fullTextRef.current, isStreaming: false }
            : m
        )
      );
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearConversation = () => {
    stopGeneration();
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'ai',
        text: 'Conversation cleared. How can I assist with your logistics or emergency dispatch today?',
      },
    ]);
  };

  async function send(query?: string) {
    const q = query || input.trim();
    if (!q || loading || isTyping) return;

    setInput('');
    const userMsgId = `usr-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;

    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: q }]);
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ner_token') || '' : '';

      // Include safe read-only client context for ground reasoning (Section 8)
      const appContext = {
        activeRoute: activeRoute || null,
        activeMission: activeMission || null,
        currentModule: currentModule || 'dashboard',
      };

      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: q,
          appContext,
          messages: messages.slice(-4),
        }),
      });

      const data = await res.json();
      const payload = data.data || data;
      const fullReply = payload.response || 'No response available.';
      const actionsData = payload.actions || [];
      const cardsData = payload.cards || [];
      const provenanceData = payload.provenance || {};

      setLoading(false);
      setIsTyping(true);
      fullTextRef.current = fullReply;
      activeMessageIdRef.current = aiMsgId;

      // Add placeholder message
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'ai',
          text: '',
          actions: actionsData,
          cards: cardsData,
          provenance: provenanceData,
          isStreaming: true,
        },
      ]);

      // Simulated progressive typing (Section 13)
      let index = 0;
      const step = Math.max(1, Math.floor(fullReply.length / 80));

      typingTimerRef.current = setInterval(() => {
        index += step;
        if (index >= fullReply.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
          setIsTyping(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: fullReply, isStreaming: false } : m
            )
          );
        } else {
          const chunk = fullReply.slice(0, index);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId ? { ...m, text: chunk } : m
            )
          );
        }
      }, 16);
    } catch {
      setLoading(false);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: '⚠️ Communication timeout connecting to AI reasoning service. Click Retry or verify network connectivity.',
        },
      ]);
    }
  }

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      send(lastUserMsg.text);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!copilotOpen && (
        <button
          onClick={toggleCopilot}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orchid to-teal text-white rounded-2xl px-5 py-3 flex items-center gap-2.5 shadow-2xl shadow-orchid/30 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-orchid"
        >
          <Brain size={22} className="animate-pulse" />
          <span className="font-bold text-sm tracking-wide">AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-safe animate-ping" />
        </button>
      )}

      {/* Main Drawer Panel */}
      <AnimatePresence>
        {copilotOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] z-50 bg-[#080C0A]/95 backdrop-blur-2xl flex flex-col border-l border-white/10 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orchid/20 text-orchid flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">NER Logistics Copilot</span>
                    <span className="text-[0.6rem] font-bold bg-safe/20 text-safe-light px-2 py-0.5 rounded">
                      GROUNDED
                    </span>
                  </div>
                  <p className="text-[0.65rem] text-mist-muted">
                    Active Context: {activeRoute ? 'Smart Route Loaded' : activeMission ? 'Emergency Mission' : 'Global Corridor Radar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearConversation}
                  title="Clear conversation"
                  className="p-1.5 rounded-lg text-mist-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={toggleCopilot}
                  className="p-1.5 rounded-lg text-mist-muted hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-teal/25 to-teal/15 border border-teal/30 text-white rounded-br-sm'
                        : 'bg-[#111A15] border border-white/10 text-mist rounded-bl-sm shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed font-sans space-y-2">
                      {m.text}
                      {m.isStreaming && <span className="inline-block w-1.5 h-3.5 bg-orchid animate-pulse ml-1 align-middle" />}
                    </div>

                    {/* Structured Cards (Section 13) */}
                    {m.cards && m.cards.length > 0 && (
                      <div className="mt-3.5 space-y-2.5">
                        {m.cards.map((card, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                {card.type === 'route' && <Route size={14} className="text-safe" />}
                                {card.type === 'risk' && <ShieldAlert size={14} className="text-amber" />}
                                {card.type === 'emergency' && <Siren size={14} className="text-danger" />}
                                {card.type === 'info' && <Info size={14} className="text-orchid" />}
                                {card.title}
                              </span>
                              {card.badge && (
                                <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded ${
                                  card.badgeVariant === 'CRITICAL'
                                    ? 'bg-danger/20 text-danger-light'
                                    : card.badgeVariant === 'HIGH'
                                    ? 'bg-amber/20 text-amber-light'
                                    : 'bg-safe/20 text-safe-light'
                                }`}>
                                  {card.badge}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[0.7rem]">
                              {card.details.map((d, dIdx) => (
                                <div key={dIdx} className={d.value.length > 30 ? 'col-span-2' : ''}>
                                  <span className="text-mist-muted block">{d.label}:</span>
                                  <span className="text-white font-medium">{d.value}</span>
                                </div>
                              ))}
                            </div>

                            {card.actionLabel && card.actionTarget && (
                              <div className="pt-2 border-t border-white/5">
                                <Link
                                  href={`/${card.actionTarget}`}
                                  className="text-[0.7rem] font-bold text-orchid-light hover:text-white flex items-center gap-1"
                                >
                                  {card.actionLabel} <ChevronRight size={12} />
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Links */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-white/5">
                        {m.actions.map((a, j) => (
                          <Link
                            key={j}
                            href={`/${a.target || ''}`}
                            className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-mist hover:bg-orchid/15 hover:text-orchid-light transition-all flex items-center gap-1"
                          >
                            <span>{a.label}</span>
                            <ExternalLink size={10} />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Metadata & Copy Footer */}
                    {m.role === 'ai' && !m.isStreaming && (
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[0.65rem] text-mist-muted">
                        <span>{m.provenance?.model || 'AuraNER Domain Grounding'}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(m.text, m.id)}
                            className="hover:text-white flex items-center gap-1 transition-colors"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check size={12} className="text-safe" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-mist-muted p-3 rounded-xl bg-white/[0.02] border border-white/5 w-fit">
                  <span className="ai-spinner !w-4 !h-4 !border-2" />
                  <span>Synthesizing multi-criteria terrain and risk data...</span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts Suggestions (Section 13 & 27) */}
            {messages.length <= 4 && (
              <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                <p className="text-[0.65rem] font-bold text-mist-muted uppercase tracking-wider mb-2">
                  Suggested Queries:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {SUGGESTIONS.slice(0, 6).map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-mist-dim hover:bg-orchid/15 hover:text-orchid-light hover:border-orchid/30 transition-all text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#0A0F0D]">
              {isTyping && (
                <div className="mb-2 flex justify-end">
                  <button
                    onClick={stopGeneration}
                    className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5 transition-all"
                  >
                    <Square size={11} className="fill-current" /> Stop Generation
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Ask about mountain routes, landslides, or emergency missions..."
                  className="flex-1 px-4 py-3 rounded-xl bg-forest-200/70 border border-white/10 text-white text-xs sm:text-sm placeholder-mist-muted focus:border-orchid/60 focus:outline-none transition-colors"
                />
                <button
                  onClick={() => send()}
                  disabled={loading || isTyping || !input.trim()}
                  className="bg-gradient-to-r from-orchid to-teal rounded-xl px-4 text-white hover:opacity-95 transition-opacity disabled:opacity-40 flex items-center justify-center"
                >
                  <Send size={16} />
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[0.65rem] text-mist-muted">
                <span>Verified with GSI, BRO &amp; NDMA protocol data</span>
                {messages.length > 2 && (
                  <button onClick={retryLastMessage} className="hover:text-white flex items-center gap-1">
                    <RotateCcw size={10} /> Retry Last
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
