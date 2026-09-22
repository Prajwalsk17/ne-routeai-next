'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton bg-forest-100/40 rounded-lg animate-pulse ${className}`}
      data-testid="skeleton"
    />
  );
}

export function SkeletonKPI() {
  return (
    <div className="glass rounded-glass p-5 border border-white/[0.06] space-y-3" data-testid="skeleton-kpi">
      <div className="w-10 h-10 rounded-[10px] skeleton bg-forest-100/60" />
      <div className="h-8 w-24 skeleton bg-forest-100/60 rounded" />
      <div className="h-3 w-32 skeleton bg-forest-100/40 rounded" />
    </div>
  );
}

export function SkeletonCard({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`glass rounded-glass p-5 border border-white/[0.06] space-y-4 ${className}`} data-testid="skeleton-card">
      <div className="flex justify-between items-center">
        <div className="h-5 w-40 skeleton bg-forest-100/60 rounded" />
        <div className="h-5 w-16 skeleton bg-forest-100/40 rounded" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 skeleton bg-forest-100/40 rounded w-full" style={{ width: `${85 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass rounded-glass p-5 border border-white/[0.06] space-y-4" data-testid="skeleton-table">
      {/* Table Header */}
      <div className="grid gap-4 pb-3 border-b border-white/[0.06]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 skeleton bg-forest-100/60 rounded w-3/4" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-4 items-center py-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 skeleton bg-forest-100/40 rounded"
                style={{ width: `${Math.max(40, ((r + c) * 23) % 100)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3" data-testid="skeleton-list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="w-9 h-9 rounded-lg skeleton bg-forest-100/60 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 skeleton bg-forest-100/60 rounded w-1/3" />
            <div className="h-3 skeleton bg-forest-100/30 rounded w-2/3" />
          </div>
          <div className="w-16 h-5 skeleton bg-forest-100/40 rounded-full" />
        </div>
      ))}
    </div>
  );
}
