// =============================================================================
// AuraNER / NER-Route AI — Production Structured Logger Foundation
// Enforces structured JSON output, correlation IDs, log levels, and PII masking.
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /aadhaar/i,
  /license/i,
  /phone/i,
  /otp/i,
  /pin/i,
  /credential/i,
  /cvv/i,
  /card/i,
  /ssn/i,
  /jwt/i,
];

export interface LogContext {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  orgId?: string;
  service?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  environment: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Recursively redacts sensitive PII and secret values from log metadata.
 */
export function sanitizeContext(data: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated: Max Depth]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact Bearer tokens embedded in raw strings
    if (data.startsWith('Bearer ')) return 'Bearer [REDACTED]';
    // Redact sensitive query parameters in URLs
    if (data.includes('token=') || data.includes('secret=') || data.includes('code=')) {
      return data.replace(/([?&](?:token|secret|code|apiKey|key)=)[^&]+/gi, '$1[REDACTED]');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeContext(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeContext(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
}

export class Logger {
  private boundContext: LogContext;

  constructor(context: LogContext = {}) {
    this.boundContext = context;
  }

  private shouldLog(level: LogLevel): boolean {
    const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
    const currentPriority = LOG_LEVEL_PRIORITY[level] ?? 1;
    const thresholdPriority = LOG_LEVEL_PRIORITY[configuredLevel] ?? 1;
    return currentPriority >= thresholdPriority;
  }

  private write(level: LogLevel, message: string, context?: LogContext, err?: Error): void {
    if (!this.shouldLog(level)) return;

    const env = process.env.APP_ENV || 'development';
    const mergedContext = {
      service: 'ne-routeai-web',
      ...this.boundContext,
      ...context,
    };

    const sanitizedContext = sanitizeContext(mergedContext) as Record<string, unknown>;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      environment: env,
      ...(Object.keys(sanitizedContext).length > 0 ? { context: sanitizedContext } : {}),
      ...(err
        ? {
            error: {
              name: err.name,
              message: err.message,
              ...(env !== 'production' ? { stack: err.stack } : {}),
            },
          }
        : {}),
    };

    if (env === 'production' || env === 'staging') {
      // Production & Staging: Single-line JSON for log forwarders (Fluentd / Datadog / Azure Monitor)
      const jsonStr = JSON.stringify(entry);
      if (level === 'error') {
        console.error(jsonStr);
      } else if (level === 'warn') {
        console.warn(jsonStr);
      } else {
        console.log(jsonStr);
      }
    } else {
      // Development: Readable colorized format
      const colorMap: Record<LogLevel, string> = {
        debug: '\x1b[90m', // Gray
        info: '\x1b[36m', // Cyan
        warn: '\x1b[33m', // Yellow
        error: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      const color = colorMap[level] || reset;
      const ctxStr = Object.keys(sanitizedContext).length > 0 ? ` ${JSON.stringify(sanitizedContext)}` : '';
      const prefix = `[${entry.timestamp}] ${color}${entry.level}${reset}: ${message}${ctxStr}`;

      if (level === 'error') {
        console.error(prefix, err ?? '');
      } else if (level === 'warn') {
        console.warn(prefix);
      } else {
        console.log(prefix);
      }
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  public error(message: string, error?: unknown, context?: LogContext): void {
    const errObj = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.write('error', message, context, errObj);
  }

  public withContext(context: LogContext): Logger {
    return new Logger({
      ...this.boundContext,
      ...context,
    });
  }
}

export const logger = new Logger();
