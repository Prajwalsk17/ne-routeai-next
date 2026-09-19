'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: LucideIcon;
  color: 'orchid' | 'teal' | 'amber' | 'danger' | 'safe' | 'info';
  trend?: { value: number; label: string };
  animate?: boolean;
}

const COLOR_MAP = {
  orchid: { bg: 'bg-orchid/10', text: 'text-orchid', border: 'border-orchid/20' },
  teal: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/20' },
  amber: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
  danger: { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/20' },
  safe: { bg: 'bg-safe/10', text: 'text-safe', border: 'border-safe/20' },
  info: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
};

export default function KPICard({ title, value, suffix, icon: Icon, color, trend, animate = true }: KPICardProps) {
  const c = COLOR_MAP[color];
  const [displayValue, setDisplayValue] = useState(animate && typeof value === 'number' ? 0 : value);

  useEffect(() => {
    if (!animate || typeof value !== 'number') return;
    const duration = 1000;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value, animate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      className="glass rounded-glass p-5 hover:border-white/[0.15] transition-all duration-300"
    >
      <div className={`w-10 h-10 rounded-[10px] ${c.bg} flex items-center justify-center mb-3`}>
        <Icon size={20} className={c.text} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[1.75rem] font-extrabold text-white font-mono">
          {displayValue}
        </span>
        {suffix && <span className="text-mist-muted text-sm">{suffix}</span>}
      </div>
      <p className="text-[0.75rem] text-mist-muted mt-1 uppercase tracking-wide font-semibold">{title}</p>
      {trend && (
        <p className={`text-[0.7rem] mt-2 ${trend.value >= 0 ? 'text-safe' : 'text-danger'}`}>
          {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
        </p>
      )}
    </motion.div>
  );
}
