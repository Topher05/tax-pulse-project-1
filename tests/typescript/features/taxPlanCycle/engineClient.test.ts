import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createTaxEngineClient,
} from "../../../../src/typescript/index.js";
import type { StructuredLogger } from "../../../../src/typescript/shared/cloud-logger/observability.js";

describe("Tax Engine client telemetry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("does not log upstream response bodies on terminal failures", async () => {
    const calls: Array<{ level: "info" | "warn" | "error"; entry: Record<string, unknown> }> = [];
    const logger: StructuredLogger = {
      info(...args: unknown[]): void {
        calls.push({ level: "info", entry: args[0] as Record<string, unknown> });
      },
      warn(...args: unknown[]): void {
        calls.push({ level: "warn", entry: args[0] as Record<string, unknown> });
      },
      error(...args: unknown[]): void {
        calls.push({ level: "error", entry: args[0] as Record<string, unknown> });
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response('{"detail":"sensitive upstream payload"}', {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = createTaxEngineClient({
      baseUrl: "http://tax-engine.example",
      maxAttempts: 1,
      telemetryLogger: logger,
    });

    await expect(
      client.compareScenarios({
        tenantId: "tenant-001",
        authorizationHeader: "Bearer test-token",
        baseline: {
          income: 100000,
          deductions: 12000,
          state: "CA",
          filing_status: "single",
        },
        scenarios: [
          {
            name: "Increase deductions",
            typed_figures: {
              income: 100000,
              deductions: 20000,
              state: "CA",
              filing_status: "single",
            },
          },
          {
            name: "Keep baseline",
            typed_figures: {
              income: 100000,
              deductions: 12000,
              state: "CA",
              filing_status: "single",
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(Error);

    const terminalFailure = calls.find((entry) => entry.entry.message === "tax engine request failed");

    expect(terminalFailure).toMatchObject({
      level: "error",
      entry: {
        service: "core-case-service",
        layer: "tax-engine-client",
        operation: "/scenarios/comparisons",
        dependency: "tax-engine",
        tenant_id: "tenant-001",
        status_code: 500,
        outcome: "failed",
        error_class: "TaxEngineHttpError",
      },
    });
    expect(JSON.stringify(terminalFailure?.entry)).not.toContain("sensitive upstream payload");
  });

  test("emits tax engine latency metrics with aggregate EMF dimensions on success", async () => {
    const calls: Array<{ level: "info" | "warn" | "error"; entry: Record<string, unknown> }> = [];
    const logger: StructuredLogger = {
      info(...args: unknown[]): void {
        calls.push({ level: "info", entry: args[0] as Record<string, unknown> });
      },
      warn(...args: unknown[]): void {
        calls.push({ level: "warn", entry: args[0] as Record<string, unknown> });
      },
      error(...args: unknown[]): void {
        calls.push({ level: "error", entry: args[0] as Record<string, unknown> });
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              name: "Keep baseline",
              total_tax: "100.00",
              delta_vs_baseline: "0.00",
            },
          ]),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    const client = createTaxEngineClient({
      baseUrl: "http://tax-engine.example",
      maxAttempts: 1,
      telemetryLogger: logger,
    });

    await client.compareScenarios({
      tenantId: "tenant-001",
      authorizationHeader: "Bearer test-token",
      baseline: {
        income: 100000,
        deductions: 12000,
        state: "CA",
        filing_status: "single",
      },
      scenarios: [
        {
          name: "Keep baseline",
          typed_figures: {
            income: 100000,
            deductions: 12000,
            state: "CA",
            filing_status: "single",
          },
        },
      ],
    });

    const successEntry = calls.find((entry) => entry.entry.message === "tax engine request completed");

    expect(successEntry).toMatchObject({
      level: "info",
      entry: {
        service: "core-case-service",
        operation: "/scenarios/comparisons",
        outcome: "success",
        metric_name: "tax_plan_cycle.tax_engine_request.duration_ms",
        metric_unit: "Milliseconds",
        _aws: {
          CloudWatchMetrics: [
            {
              Namespace: "TaxPulse",
              Dimensions: [
                ["service", "operation", "outcome"],
                ["service"],
              ],
              Metrics: [
                {
                  Name: "tax_plan_cycle.tax_engine_request.duration_ms",
                  Unit: "Milliseconds",
                },
              ],
            },
          ],
        },
      },
    });
    expect(successEntry?.entry.metric_value).toEqual(expect.any(Number));
  });
});
