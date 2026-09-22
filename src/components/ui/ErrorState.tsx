'use client';

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  correlationId?: string;
  onRetry?: () => Promise<void> | void;
  compact?: boolean;
  className?: string;
}

export default function ErrorState({
  title = 'Service Interruption Detected',
  message = 'An unexpected error occurred while communicating with logistics telemetry services.',
  correlationId,
  onRetry,
  compact = false,
  className = '',
}: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    try {
      setRetrying(true);
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-glass border border-danger/25 bg-danger/5 backdrop-blur-sm ${
        compact ? 'p-5 py-6' : 'p-8 py-10'
      } ${className}`}
      data-testid="error-state"
    >
      <div
        className={`rounded-full bg-danger/15 text-danger-light border border-danger/30 flex items-center justify-center mb-3.5 ${
          compact ? 'w-10 h-10' : 'w-13 h-13 p-3'
        }`}
      >
        <AlertTriangle size={compact ? 20 : 26} className="text-danger" />
      </div>

      <h4 className="text-base font-bold text-white mb-1.5">{title}</h4>
      <p className="text-sm text-mist-dim max-w-md mb-4 leading-relaxed">
        {message}
      </p>

      {correlationId && (
        <div className="mb-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/40 border border-white/[0.08] text-[0.7rem] font-mono text-mist-muted">
          <span>ref:</span>
          <span className="text-mist-dim select-all">{correlationId}</span>
        </div>
      )}

      {onRetry && (
        <Button
          variant="secondary"
          size={compact ? 'sm' : 'md'}
          icon={RefreshCw}
          isLoading={retrying}
          loadingText="Retrying..."
          onClick={handleRetry}
        >
          Retry Connection
        </Button>
      )}
    </div>
  );
}
