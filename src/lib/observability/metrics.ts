/**
 * AuraNER / NER-Route AI — Production Metrics Registry & Prometheus Exporter
 * 
 * Implements OpenTelemetry-compatible metric instruments:
 * - Counter: Monotonically increasing metric (HTTP requests, GPS pings, AI tokens)
 * - UpDownCounter: Increment / decrement metric (active connections, pending tasks)
 * - Histogram: Statistical distribution & bucketed latency percentiles (p50, p90, p95, p99)
 * - Gauge: Instantaneous value (active fleet count, current memory, active alerts)
 * - Prometheus text exposition format generator
 */

export type Labels = Record<string, string | number | boolean>;

function serializeLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  const formatted = entries
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
    .join(',');
  return `{${formatted}}`;
}

export class Counter {
  public readonly name: string;
  public readonly help: string;
  private values = new Map<string, { value: number; labels: Labels }>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  public inc(value = 1, labels: Labels = {}): void {
    if (value < 0) throw new Error('Counter cannot be decremented');
    const key = serializeLabels(labels);
    const existing = this.values.get(key) || { value: 0, labels };
    existing.value += value;
    this.values.set(key, existing);
  }

  public get(labels: Labels = {}): number {
    const key = serializeLabels(labels);
    return this.values.get(key)?.value || 0;
  }

  public getValues(): Array<{ value: number; labels: Labels }> {
    return Array.from(this.values.values());
  }

  public reset(): void {
    this.values.clear();
  }
}

export class Gauge {
  public readonly name: string;
  public readonly help: string;
  private values = new Map<string, { value: number; labels: Labels }>();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  public set(value: number, labels: Labels = {}): void {
    const key = serializeLabels(labels);
    this.values.set(key, { value, labels });
  }

  public get(labels: Labels = {}): number {
    const key = serializeLabels(labels);
    return this.values.get(key)?.value || 0;
  }

  public getValues(): Array<{ value: number; labels: Labels }> {
    return Array.from(this.values.values());
  }

  public reset(): void {
    this.values.clear();
  }
}

export class Histogram {
  public readonly name: string;
  public readonly help: string;
  public readonly buckets: number[];
  private distributions = new Map<
    string,
    {
      count: number;
      sum: number;
      bucketCounts: number[];
      values: number[];
      labels: Labels;
    }
  >();

  constructor(name: string, help: string, buckets = [5, 15, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
    this.name = name;
    this.help = help;
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  public record(val: number, labels: Labels = {}): void {
    const key = serializeLabels(labels);
    let dist = this.distributions.get(key);
    if (!dist) {
      dist = {
        count: 0,
        sum: 0,
        bucketCounts: new Array(this.buckets.length + 1).fill(0),
        values: [],
        labels,
      };
      this.distributions.set(key, dist);
    }

    dist.count += 1;
    dist.sum += val;
    dist.values.push(val);

    // Increment buckets
    for (let i = 0; i < this.buckets.length; i++) {
      if (val <= this.buckets[i]) {
        dist.bucketCounts[i] += 1;
      }
    }
    dist.bucketCounts[this.buckets.length] += 1; // +Inf bucket
  }

  public getStats(labels: Labels = {}): {
    count: number;
    sum: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  } {
    const key = serializeLabels(labels);
    const dist = this.distributions.get(key);
    if (!dist || dist.values.length === 0) {
      return { count: 0, sum: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...dist.values].sort((a, b) => a - b);
    const count = sorted.length;
    const p50 = sorted[Math.floor(count * 0.5)] || 0;
    const p90 = sorted[Math.floor(count * 0.9)] || 0;
    const p95 = sorted[Math.floor(count * 0.95)] || 0;
    const p99 = sorted[Math.floor(count * 0.99)] || 0;

    return {
      count,
      sum: dist.sum,
      avg: Math.round((dist.sum / count) * 100) / 100,
      p50,
      p90,
      p95,
      p99,
    };
  }

  public getDistributions() {
    return Array.from(this.distributions.values());
  }

  public reset(): void {
    this.distributions.clear();
  }
}

export class MetricsRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();

  public counter(name: string, help: string): Counter {
    let c = this.counters.get(name);
    if (!c) {
      c = new Counter(name, help);
      this.counters.set(name, c);
    }
    return c;
  }

  public gauge(name: string, help: string): Gauge {
    let g = this.gauges.get(name);
    if (!g) {
      g = new Gauge(name, help);
      this.gauges.set(name, g);
    }
    return g;
  }

  public histogram(name: string, help: string, buckets?: number[]): Histogram {
    let h = this.histograms.get(name);
    if (!h) {
      h = new Histogram(name, help, buckets);
      this.histograms.set(name, h);
    }
    return h;
  }

  public resetAll(): void {
    this.counters.forEach((c) => c.reset());
    this.gauges.forEach((g) => g.reset());
    this.histograms.forEach((h) => h.reset());
  }

  /**
   * Generates Prometheus exposition format text
   */
  public formatPrometheus(): string {
    const lines: string[] = [];

    // Format Counters
    for (const counter of Array.from(this.counters.values())) {
      lines.push(`# HELP ${counter.name} ${counter.help}`);
      lines.push(`# TYPE ${counter.name} counter`);
      for (const item of counter.getValues()) {
        lines.push(`${counter.name}${serializeLabels(item.labels)} ${item.value}`);
      }
    }

    // Format Gauges
    for (const gauge of Array.from(this.gauges.values())) {
      lines.push(`# HELP ${gauge.name} ${gauge.help}`);
      lines.push(`# TYPE ${gauge.name} gauge`);
      for (const item of gauge.getValues()) {
        lines.push(`${gauge.name}${serializeLabels(item.labels)} ${item.value}`);
      }
    }

    // Format Histograms
    for (const hist of Array.from(this.histograms.values())) {
      lines.push(`# HELP ${hist.name} ${hist.help}`);
      lines.push(`# TYPE ${hist.name} histogram`);
      for (const dist of hist.getDistributions()) {
        for (let i = 0; i < hist.buckets.length; i++) {
          const bLabels = { ...dist.labels, le: hist.buckets[i] };
          lines.push(`${hist.name}_bucket${serializeLabels(bLabels)} ${dist.bucketCounts[i]}`);
        }
        const infLabels = { ...dist.labels, le: '+Inf' };
        lines.push(`${hist.name}_bucket${serializeLabels(infLabels)} ${dist.count}`);
        lines.push(`${hist.name}_sum${serializeLabels(dist.labels)} ${dist.sum}`);
        lines.push(`${hist.name}_count${serializeLabels(dist.labels)} ${dist.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}

// Global default registry
export const metrics = new MetricsRegistry();

// -----------------------------------------------------------------------------
// Pre-registered Production Operational Metrics
// -----------------------------------------------------------------------------
export const httpRequestsTotal = metrics.counter(
  'http_requests_total',
  'Total count of incoming HTTP requests handled by the platform'
);

export const httpRequestDurationMs = metrics.histogram(
  'http_request_duration_ms',
  'Duration of HTTP request processing in milliseconds',
  [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
);

export const routeCalculationDurationMs = metrics.histogram(
  'route_calculation_duration_ms',
  'Geospatial route planning and terrain solver duration in milliseconds',
  [50, 100, 250, 500, 1000, 2000, 5000]
);

export const gpsPingsIngestedTotal = metrics.counter(
  'gps_pings_ingested_total',
  'Total count of GPS telemetry position pings ingested'
);

export const activeFleetVehicles = metrics.gauge(
  'active_fleet_vehicles',
  'Number of operational vehicles currently active in the fleet'
);

export const aiAgentExecutionsTotal = metrics.counter(
  'ai_agent_executions_total',
  'Total number of autonomous AI agent cycle executions'
);

export const aiAgentTokenConsumptionTotal = metrics.counter(
  'ai_agent_token_consumption_total',
  'Total token usage consumed across AI multi-agent reasoning cycles'
);

export const optimizationRunsTotal = metrics.counter(
  'optimization_runs_total',
  'Total number of combinatorial logistics optimization solver runs'
);

export const optimizationDurationMs = metrics.histogram(
  'optimization_duration_ms',
  'Duration of OR-Tools combinatorial solver runs in milliseconds',
  [100, 250, 500, 1000, 2500, 5000, 10000]
);

export const ingestionJobRunsTotal = metrics.counter(
  'ingestion_job_runs_total',
  'Total number of external NER data ingestion pipeline jobs executed'
);

export const activeAlertsGauge = metrics.gauge(
  'active_alerts_total',
  'Current count of active, unresolved operational alerts'
);
