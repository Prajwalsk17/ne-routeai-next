'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'ai' | 'danger' | 'elevated';
  hover?: boolean;
  onClick?: () => void;
}

const variants = {
  default: 'bg-forest-200/60 backdrop-blur-glass border border-white/[0.08]',
  ai: 'bg-orchid-subtle backdrop-blur-glass border border-orchid/[0.15] shadow-ai-glow',
  danger: 'bg-danger-glow backdrop-blur-glass border border-danger/20',
  elevated: 'bg-forest-100/80 backdrop-blur-heavy border border-white/[0.1]',
};

export default function GlassCard({ children, className = '', variant = 'default', hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`rounded-glass ${variants[variant]} ${hover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
