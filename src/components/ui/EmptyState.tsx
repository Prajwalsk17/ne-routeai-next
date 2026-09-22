'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  compact?: boolean;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  primaryAction,
  secondaryAction,
  compact = false,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-glass border border-white/[0.06] bg-forest-200/40 backdrop-blur-sm ${
        compact ? 'p-6 py-8' : 'p-8 py-12'
      } ${className}`}
      data-testid="empty-state"
    >
      <div
        className={`rounded-full bg-forest-100 flex items-center justify-center text-mist-dim border border-white/[0.08] mb-4 ${
          compact ? 'w-11 h-11' : 'w-14 h-14'
        }`}
      >
        <Icon size={compact ? 22 : 28} className="text-mist-dim" />
      </div>

      <h4 className="text-base font-bold text-white mb-1.5">{title}</h4>
      <p className="text-sm text-mist-dim max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button variant="primary" size={compact ? 'sm' : 'md'} icon={primaryAction.icon}>
                  {primaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size={compact ? 'sm' : 'md'}
                icon={primaryAction.icon}
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="secondary" size={compact ? 'sm' : 'md'}>
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size={compact ? 'sm' : 'md'}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
