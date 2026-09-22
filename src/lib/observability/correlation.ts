/**
 * AuraNER / NER-Route AI — Request Correlation & Context Propagation
 * 
 * Manages distributed request correlation:
 * - X-Correlation-ID / X-Request-ID propagation
 * - W3C TraceContext traceparent injection
 * - Structured Logger context binding
 */

import { parseW3cTraceparent, serializeW3cTraceparent, generateTraceId, generateSpanId } from './tracer';
import { logger, Logger } from '@/lib/logger';

export interface RequestCorrelationContext {
  correlationId: string;
  requestId: string;
  traceparent: string;
  traceId: string;
  spanId: string;
}

/**
 * Resolves or generates correlation context from incoming request headers
 */
export function resolveRequestCorrelation(headers: Headers): RequestCorrelationContext {
  const existingCorrelationId = headers.get('x-correlation-id');
  const existingRequestId = headers.get('x-request-id');
  const existingTraceparent = headers.get('traceparent');

  const parsedTrace = parseW3cTraceparent(existingTraceparent);
  const traceId = parsedTrace ? parsedTrace.traceId : generateTraceId();
  const spanId = generateSpanId();
  const traceparent = serializeW3cTraceparent({
    traceId,
    spanId,
    traceFlags: 1,
    isSampled: true,
  });

  const correlationId = existingCorrelationId || traceId;
  const requestId = existingRequestId || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'req-' + Math.random().toString(36).substring(2, 15));

  return {
    correlationId,
    requestId,
    traceparent,
    traceId,
    spanId,
  };
}

/**
 * Creates correlation response headers to echo back to caller
 */
export function getCorrelationHeaders(context: RequestCorrelationContext): Record<string, string> {
  return {
    'X-Correlation-ID': context.correlationId,
    'X-Request-ID': context.requestId,
    'traceparent': context.traceparent,
  };
}

/**
 * Creates a correlated Logger instance bound with correlation context
 */
export function createCorrelatedLogger(context: RequestCorrelationContext, extra: Record<string, unknown> = {}): Logger {
  return logger.withContext({
    correlationId: context.correlationId,
    requestId: context.requestId,
    traceId: context.traceId,
    spanId: context.spanId,
    ...extra,
  });
}
