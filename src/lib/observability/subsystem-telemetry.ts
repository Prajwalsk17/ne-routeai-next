/**
 * AuraNER / NER-Route AI — Specialized Subsystem Observability Wrappers
 * 
 * Provides end-to-end tracing and metric instrumentation for:
 * 1. AI multi-agent reasoning cycles (LangGraph)
 * 2. Combinatorial logistics optimization runs (OR-Tools)
 * 3. High-frequency GPS telemetry streams
 * 4. External NER meteorological and road data ingestion jobs
 */

import { defaultTracer, Span } from './tracer';
import {
  aiAgentExecutionsTotal,
  aiAgentTokenConsumptionTotal,
  optimizationRunsTotal,
  optimizationDurationMs,
  gpsPingsIngestedTotal,
  ingestionJobRunsTotal,
} from './metrics';
import { logger } from '@/lib/logger';

/**
 * Instruments an AI Agent reasoning cycle with distributed tracing and token metrics
 */
export async function observeAiExecution<T>(
  agentName: string,
  runId: string,
  fn: (span: Span) => Promise<{ result: T; promptTokens?: number; completionTokens?: number; status: string }>
): Promise<T> {
  return defaultTracer.withSpan(
    `ai_agent.${agentName}`,
    async (span) => {
      span.setAttribute('agent.name', agentName);
      span.setAttribute('agent.run_id', runId);

      const startTime = Date.now();
      try {
        const output = await fn(span);
        const durationMs = Date.now() - startTime;

        span.setAttribute('agent.status', output.status);
        span.setAttribute('agent.duration_ms', durationMs);

        const totalTokens = (output.promptTokens || 0) + (output.completionTokens || 0);
        if (totalTokens > 0) {
          span.setAttribute('agent.tokens.total', totalTokens);
          aiAgentTokenConsumptionTotal.inc(totalTokens, { agent: agentName });
        }

        aiAgentExecutionsTotal.inc(1, { agent: agentName, status: output.status });

        logger.info(`AI agent [${agentName}] completed cycle`, {
          agent: agentName,
          runId,
          status: output.status,
          durationMs,
          totalTokens,
        });

        return output.result;
      } catch (err) {
        aiAgentExecutionsTotal.inc(1, { agent: agentName, status: 'FAILED' });
        span.recordException(err);
        logger.error(`AI agent [${agentName}] run failed`, err, { agent: agentName, runId });
        throw err;
      }
    },
    { kind: 'INTERNAL' }
  );
}

/**
 * Instruments a combinatorial VRPTW/CVRP optimization run
 */
export async function observeOptimization<T>(
  solverType: string,
  dimensions: { vehiclesCount: number; shipmentsCount: number },
  fn: (span: Span) => Promise<{ result: T; status: string; objectiveCost?: number }>
): Promise<T> {
  return defaultTracer.withSpan(
    `optimization.solve.${solverType.toLowerCase()}`,
    async (span) => {
      span.setAttribute('optimization.solver', solverType);
      span.setAttribute('optimization.vehicles_count', dimensions.vehiclesCount);
      span.setAttribute('optimization.shipments_count', dimensions.shipmentsCount);

      const startTime = Date.now();
      try {
        const output = await fn(span);
        const durationMs = Date.now() - startTime;

        span.setAttribute('optimization.status', output.status);
        span.setAttribute('optimization.duration_ms', durationMs);
        if (output.objectiveCost !== undefined) {
          span.setAttribute('optimization.objective_cost', output.objectiveCost);
        }

        optimizationRunsTotal.inc(1, { solver: solverType, status: output.status });
        optimizationDurationMs.record(durationMs, { solver: solverType });

        logger.info(`Optimization run [${solverType}] completed`, {
          solver: solverType,
          status: output.status,
          durationMs,
          vehicles: dimensions.vehiclesCount,
          shipments: dimensions.shipmentsCount,
        });

        return output.result;
      } catch (err) {
        optimizationRunsTotal.inc(1, { solver: solverType, status: 'FAILED' });
        span.recordException(err);
        logger.error(`Optimization run [${solverType}] failed`, err, { solver: solverType });
        throw err;
      }
    },
    { kind: 'INTERNAL' }
  );
}

/**
 * Observes GPS telemetry ingestion pings and updates counters
 */
export function observeGpsIngest(
  organizationId: string,
  pingCount: number,
  freshness: string
): void {
  gpsPingsIngestedTotal.inc(pingCount, {
    organization: organizationId || 'unknown',
    freshness,
  });
}

/**
 * Instruments an external NER data ingestion job run
 */
export async function observeExternalIngestion<T>(
  sourceCode: string,
  jobId: string,
  fn: (span: Span) => Promise<{ result: T; recordCount: number; status: string }>
): Promise<T> {
  return defaultTracer.withSpan(
    `ingestion.job.${sourceCode.toLowerCase()}`,
    async (span) => {
      span.setAttribute('ingestion.source', sourceCode);
      span.setAttribute('ingestion.job_id', jobId);

      const startTime = Date.now();
      try {
        const output = await fn(span);
        const durationMs = Date.now() - startTime;

        span.setAttribute('ingestion.status', output.status);
        span.setAttribute('ingestion.record_count', output.recordCount);
        span.setAttribute('ingestion.duration_ms', durationMs);

        ingestionJobRunsTotal.inc(1, { source: sourceCode, status: output.status });

        logger.info(`Ingestion job [${sourceCode}] completed`, {
          source: sourceCode,
          jobId,
          records: output.recordCount,
          durationMs,
        });

        return output.result;
      } catch (err) {
        ingestionJobRunsTotal.inc(1, { source: sourceCode, status: 'FAILED' });
        span.recordException(err);
        logger.error(`Ingestion job [${sourceCode}] failed`, err, { source: sourceCode, jobId });
        throw err;
      }
    },
    { kind: 'CLIENT' }
  );
}
