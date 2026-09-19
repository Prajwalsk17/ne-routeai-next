'use client';
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'orchid' | 'teal' | 'amber' | 'danger' | 'safe' | 'info';
  height?: string;
  showLabel?: boolean;
  className?: string;
}
const COLORS = {
  orchid: 'bg-orchid', teal: 'bg-teal', amber: 'bg-amber',
  danger: 'bg-danger', safe: 'bg-safe', info: 'bg-info',
};
export default function ProgressBar({ value, max = 100, color = 'orchid', height = 'h-2', showLabel, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={className}>
      <div className={`w-full ${height} bg-white/[0.06] rounded-full overflow-hidden`}>
        <div className={`${height} ${COLORS[color]} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-[0.7rem] text-mist-muted mt-1 block">{Math.round(pct)}%</span>}
    </div>
  );
}
