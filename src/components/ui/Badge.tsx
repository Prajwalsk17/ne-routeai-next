'use client';

type BadgeVariant = 'CRITICAL' | 'HIGH' | 'WARNING' | 'MODERATE' | 'LOW' | 'ADVISORY' | 'INFORMATION' | 'success' | 'ai' | 'demo';

const STYLES: Record<BadgeVariant, string> = {
  CRITICAL: 'bg-danger-glow text-danger-light border-danger/30',
  HIGH: 'bg-amber-glow text-amber-light border-amber/30',
  WARNING: 'bg-amber-glow text-amber-light border-amber/30',
  MODERATE: 'bg-info-glow text-info-light border-info/30',
  LOW: 'bg-safe-glow text-safe-light border-safe/30',
  ADVISORY: 'bg-teal-glow text-teal-light border-teal/30',
  INFORMATION: 'bg-info-glow text-info-light border-info/30',
  success: 'bg-safe-glow text-safe-light border-safe/30',
  ai: 'bg-orchid-glow text-orchid-light border-orchid/30',
  demo: 'bg-amber-glow text-amber-light border-amber/30',
};

interface BadgeProps {
  variant: BadgeVariant | string;
  children?: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export default function Badge({ variant, children, className = '', dot = false }: BadgeProps) {
  const style = STYLES[variant as BadgeVariant] || STYLES.MODERATE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.65rem] font-bold border ${style} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`} />}
      {children}
    </span>
  );
}
