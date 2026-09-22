'use client';

import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'sos';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-orchid to-orchid-light hover:brightness-110 text-white font-semibold shadow-ai-glow border border-orchid/30',
  secondary:
    'bg-forest-100/80 hover:bg-forest-100 border border-white/10 text-mist hover:text-white shadow-sm',
  danger:
    'bg-danger hover:bg-danger/90 text-white font-semibold shadow-danger-glow border border-danger/30',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-mist-dim hover:text-white border border-transparent',
  sos:
    'bg-danger hover:bg-danger/90 border-2 border-white text-white font-extrabold uppercase tracking-wider animate-pulse shadow-danger-glow',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-lg gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  isLoading = false,
  loadingText,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 select-none ${
        VARIANTS[variant]
      } ${SIZES[size]} ${
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'active:scale-[0.98]'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
