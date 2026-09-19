// =============================================================================
// AuraNER / NER-RouteAI — Enterprise Circuit Breaker
// Provides fault tolerance, rate limit / quota protection, and fast-failover
// for high-availability enterprise logistics APIs.
// =============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // Failures before opening circuit (default: 3)
  recoveryTimeoutMs?: number; // Cooldown before trying half-open (default: 30000ms)
  successThreshold?: number; // Successes in half-open before closing (default: 2)
  isFailure?: (error: unknown) => boolean;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly serviceName: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttemptTimestamp = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly successThreshold: number;
  private readonly isFailurePredicate: (error: unknown) => boolean;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
    this.isFailurePredicate = options.isFailure ?? this.defaultIsFailure;
  }

  public getState(): CircuitState {
    // If OPEN and cooldown window has passed, automatically transition to HALF_OPEN
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTimestamp) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    return this.state;
  }

  public getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptInMs: Math.max(0, this.nextAttemptTimestamp - Date.now()),
    };
  }

  /**
   * Executes the primary action protected by the circuit breaker.
   * If the circuit is OPEN or the primary fails, executes the secondary fallback.
   */
  public async execute<T>(
    primaryAction: () => Promise<T>,
    fallbackAction?: () => Promise<T>
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      if (fallbackAction) {
        return fallbackAction();
      }
      throw new CircuitBreakerError(
        `Circuit breaker for '${this.name}' is OPEN. Quota or server errors active.`,
        this.name,
        'OPEN'
      );
    }

    try {
      const result = await primaryAction();
      this.onSuccess();
      return result;
    } catch (err: unknown) {
      if (this.isFailurePredicate(err)) {
        this.onFailure();
      }

      if (fallbackAction) {
        return fallbackAction();
      }

      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTimestamp = Date.now() + this.recoveryTimeoutMs;
    }
  }

  private defaultIsFailure(error: unknown): boolean {
    if (!error) return false;

    // Check for HTTP 429 (Rate Limit / Quota) or HTTP 5xx
    if (typeof error === 'object' && error !== null) {
      const status = (error as { status?: number; statusCode?: number }).status ??
        (error as { status?: number; statusCode?: number }).statusCode;

      if (typeof status === 'number') {
        return status === 429 || (status >= 500 && status < 600);
      }

      const message = (error as { message?: string }).message;
      if (typeof message === 'string') {
        const lower = message.toLowerCase();
        return (
          lower.includes('quota') ||
          lower.includes('rate limit') ||
          lower.includes('429') ||
          lower.includes('502') ||
          lower.includes('503') ||
          lower.includes('504') ||
          lower.includes('timeout') ||
          lower.includes('econnrefused')
        );
      }
    }

    return true;
  }

  /**
   * Manually reset the circuit breaker state (useful for testing or administration).
   */
  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTimestamp = 0;
  }

  /**
   * Manually trip the circuit breaker into OPEN state (useful for quota limits).
   */
  public trip(): void {
    this.state = 'OPEN';
    this.nextAttemptTimestamp = Date.now() + this.recoveryTimeoutMs;
  }
}
