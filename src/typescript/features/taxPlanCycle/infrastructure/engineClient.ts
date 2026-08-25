import {
  scenarioComparisonEngineOutputSchema,
  type ScenarioComparisonEngineOutput,
  type ScenarioComparisonEngineInput,
} from "../scenarioModeling.js";
import { z } from "zod";
import {
  emitObservabilityEvent,
  createTracePropagationHeaders,
  type TraceContext,
  type StructuredLogger,
} from "../../../shared/cloud-logger/observability.js";

export type TaxCalculationEngineFilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household"
  | "qualifying_surviving_spouse";

export interface TaxCalculationEngineInput {
  income: number | string;
  deductions: number | string;
  withholding?: number;
  state: string;
  filing_status: TaxCalculationEngineFilingStatus;
}

export interface TaxCalculationEngineRequest
  extends TaxCalculationEngineInput {
  tenantId: string;
  authorizationHeader: string;
  requestContext?: Partial<TraceContext>;
}

const taxCalculationEngineResultSchema = z.strictObject({
  income: z.string(),
  deductions: z.string(),
  state: z.string(),
  filing_status: z.enum([
    "single",
    "married_filing_jointly",
    "married_filing_separately",
    "head_of_household",
    "qualifying_surviving_spouse",
  ]),
  taxable_income: z.string(),
  federal_liability: z.string(),
  state_liability: z.string(),
  total_liability: z.string(),
  effective_rate: z.string(),
  marginal_rate: z.string(),
  currency: z.string(),
});

export type TaxCalculationEngineResult = z.infer<
  typeof taxCalculationEngineResultSchema
>;

export interface ScenarioComparisonEngineRequest
  extends ScenarioComparisonEngineInput {
  tenantId: string;
  authorizationHeader: string;
  requestContext?: Partial<TraceContext>;
}

export type TaxEngineComparisonRequest = ScenarioComparisonEngineRequest;

export interface TaxEngineClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  maxAttempts?: number;
  baseDelayMs?: number;
  telemetryLogger?: StructuredLogger;
}

export interface TaxEngineClient {
  calculateTax(
    input: TaxCalculationEngineRequest,
  ): Promise<TaxCalculationEngineResult>;
  compareScenarios(
    input: ScenarioComparisonEngineRequest,
  ): Promise<ScenarioComparisonEngineOutput>;
}

const defaultTimeoutMs = 2_000;
const defaultMaxAttempts = 3;
const defaultBaseDelayMs = 250;

export class TaxEngineTimeoutError extends Error {
  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(`Tax Engine request to ${url} timed out after ${timeoutMs}ms.`);
    this.name = "TaxEngineTimeoutError";
  }
}

export class TaxEngineHttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`Tax Engine request to ${url} failed with HTTP ${status}.`);
    this.name = "TaxEngineHttpError";
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function retryDelay(attempt: number, baseDelayMs: number): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.random() * exponentialDelay * 0.25;

  return Math.round(exponentialDelay + jitter);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new TaxEngineTimeoutError(url, timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createTaxEngineClient(
  options: TaxEngineClientOptions,
): TaxEngineClient {
  const baseUrl = new URL(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const maxAttempts = options.maxAttempts ?? defaultMaxAttempts;
  const baseDelayMs = options.baseDelayMs ?? defaultBaseDelayMs;
  const telemetryLogger = options.telemetryLogger ?? console;

  async function postJsonWithRetry(
    path: string,
    input: {
      tenantId: string;
      authorizationHeader: string;
      requestContext?: Partial<TraceContext>;
    },
    body: string,
  ): Promise<unknown> {
    const url = new URL(path, baseUrl).toString();

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const startedAt = Date.now();
      const traceHeaders = createTracePropagationHeaders(input.requestContext);
      emitObservabilityEvent(telemetryLogger, "info", "tax engine request started", {
        service: "core-case-service",
        layer: "tax-engine-client",
        operation: path,
        dependency: "tax-engine",
        tenant_id: input.tenantId,
        attempt,
        route: path,
        ...input.requestContext,
        metric_name: "tax_plan_cycle.tax_engine_request.count",
        metric_value: 1,
        metric_unit: "Count",
      });

      try {
        const response = await fetchWithTimeout(
          url,
          {
            method: "POST",
            headers: {
              authorization: input.authorizationHeader,
              "content-type": "application/json",
              "x-taxpulse-tenant-id": input.tenantId,
              ...traceHeaders,
            },
            body,
          },
          timeoutMs,
        );

        if (!response.ok) {
          const errorBody = await response.text();

          if (isRetryableStatus(response.status) && attempt < maxAttempts) {
            emitObservabilityEvent(telemetryLogger, "warn", "tax engine request retrying", {
              service: "core-case-service",
              layer: "tax-engine-client",
              operation: path,
              dependency: "tax-engine",
              tenant_id: input.tenantId,
              attempt,
              status_code: response.status,
              duration_ms: Date.now() - startedAt,
              outcome: "retrying",
              error_class: "TaxEngineHttpError",
              ...input.requestContext,
              metric_name: "tax_plan_cycle.tax_engine_request.count",
              metric_value: 1,
              metric_unit: "Count",
            });
            await sleep(retryDelay(attempt, baseDelayMs));
            continue;
          }

          emitObservabilityEvent(telemetryLogger, "error", "tax engine request failed", {
            service: "core-case-service",
            layer: "tax-engine-client",
            operation: path,
            dependency: "tax-engine",
            tenant_id: input.tenantId,
            attempt,
            status_code: response.status,
            duration_ms: Date.now() - startedAt,
            outcome: "failed",
            error_class: "TaxEngineHttpError",
            ...input.requestContext,
            metric_name: "tax_plan_cycle.tax_engine_request.count",
            metric_value: 1,
            metric_unit: "Count",
          });
          throw new TaxEngineHttpError(url, response.status, errorBody);
        }

        emitObservabilityEvent(telemetryLogger, "info", "tax engine request completed", {
          service: "core-case-service",
          layer: "tax-engine-client",
          operation: path,
          dependency: "tax-engine",
          tenant_id: input.tenantId,
          attempt,
          status_code: response.status,
          duration_ms: Date.now() - startedAt,
          outcome: "success",
          ...input.requestContext,
          metric_name: "tax_plan_cycle.tax_engine_request.duration_ms",
          metric_value: Date.now() - startedAt,
          metric_unit: "Milliseconds",
        });
        return await response.json();
      } catch (error) {
        if (attempt >= maxAttempts) {
          emitObservabilityEvent(telemetryLogger, "error", "tax engine request exhausted retries", {
            service: "core-case-service",
            layer: "tax-engine-client",
            operation: path,
            dependency: "tax-engine",
            tenant_id: input.tenantId,
            attempt,
            duration_ms: Date.now() - startedAt,
            outcome: "failed",
            error_class: error instanceof Error ? error.name : "Error",
            error: error instanceof Error ? error.message : String(error),
            ...input.requestContext,
            metric_name: "tax_plan_cycle.tax_engine_request.count",
            metric_value: 1,
            metric_unit: "Count",
          });
          throw error;
        }

        if (
          error instanceof TaxEngineTimeoutError ||
          error instanceof TaxEngineHttpError
        ) {
          if (error instanceof TaxEngineHttpError && !isRetryableStatus(error.status)) {
            throw error;
          }

          emitObservabilityEvent(telemetryLogger, "warn", "tax engine request retrying", {
            service: "core-case-service",
            layer: "tax-engine-client",
            operation: path,
            dependency: "tax-engine",
            tenant_id: input.tenantId,
            attempt,
            duration_ms: Date.now() - startedAt,
            outcome: "retrying",
            error_class: error.name,
            error: error.message,
            ...input.requestContext,
            metric_name: "tax_plan_cycle.tax_engine_request.count",
            metric_value: 1,
            metric_unit: "Count",
          });
          await sleep(retryDelay(attempt, baseDelayMs));
          continue;
        }

        emitObservabilityEvent(telemetryLogger, "warn", "tax engine request retrying", {
          service: "core-case-service",
          layer: "tax-engine-client",
          operation: path,
          dependency: "tax-engine",
          tenant_id: input.tenantId,
          attempt,
          duration_ms: Date.now() - startedAt,
          outcome: "retrying",
          error_class: error instanceof Error ? error.name : "Error",
          error: error instanceof Error ? error.message : String(error),
          ...input.requestContext,
          metric_name: "tax_plan_cycle.tax_engine_request.count",
          metric_value: 1,
          metric_unit: "Count",
        });
        await sleep(retryDelay(attempt, baseDelayMs));
      }
    }

    throw new Error("Tax Engine request failed after exhausting retries.");
  }

  return {
    async calculateTax(input) {
      const payload = await postJsonWithRetry(
        "/tax-calculations",
        input,
        JSON.stringify({
          income: input.income,
          deductions: input.deductions,
          withholding: input.withholding,
          state: input.state,
          filing_status: input.filing_status,
        }),
      );

      return taxCalculationEngineResultSchema.parse(payload);
    },

    async compareScenarios(input) {
      const body = JSON.stringify({
        baseline: input.baseline,
        scenarios: input.scenarios,
      });
      const payload = await postJsonWithRetry(
        "/scenarios/comparisons",
        input,
        body,
      );

      return scenarioComparisonEngineOutputSchema.parse(payload);
    },
  };
}
