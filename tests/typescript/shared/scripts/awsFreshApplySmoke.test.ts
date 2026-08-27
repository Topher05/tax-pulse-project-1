import { describe, expect, test, vi } from "vitest";

import { runAwsFreshApplySmoke } from "../../../../src/typescript/shared/scripts/awsFreshApplySmoke.js";

const env = {
  TAXPULSE_ALB_BASE_URL: "https://alb.example.test",
  TAXPULSE_TRANSITION_API_URL: "https://api.example.test",
  TAXPULSE_SMOKE_BEARER_TOKEN: "synthetic-token",
  TAXPULSE_SMOKE_TENANT_ID: "tenant-smoke",
  TAXPULSE_SMOKE_CASE_ID: "case-smoke",
  TAXPULSE_PROJECTION_TABLE_NAME: "projection-smoke",
  AWS_REGION: "us-east-1",
};

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AWS fresh-apply smoke", () => {
  test("runs ALB, transition, and projection phases in order", async () => {
    const phases: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      phases.push(String(input).includes("tax-calculations") ? "alb" : "transition");
      return response(200, { ok: true });
    });
    const projectionStages = [undefined, "Client Approval"];
    const getProjectionStage = vi.fn(async () => projectionStages.shift());

    const result = await runAwsFreshApplySmoke({
      env,
      fetchImpl,
      getProjectionStage,
      pollAttempts: 3,
      pollDelayMs: 0,
    });

    expect(result).toEqual({
      albStatus: 200,
      transitionStatus: 200,
      projectedStage: "Client Approval",
      pollAttempts: 2,
    });
    expect(phases).toEqual(["alb", "transition"]);
    expect(getProjectionStage).toHaveBeenCalledTimes(2);
  });

  test("identifies the failed phase", async () => {
    const fetchImpl = vi.fn(async () => response(503, { error: "unavailable" }));

    await expect(runAwsFreshApplySmoke({ env, fetchImpl })).rejects.toThrow(
      "failed during ALB calculation",
    );
  });

  test("fails when the projection never reaches Client Approval", async () => {
    const fetchImpl = vi.fn(async () => response(200, { ok: true }));
    const getProjectionStage = vi.fn(async () => "Review");

    await expect(runAwsFreshApplySmoke({
      env,
      fetchImpl,
      getProjectionStage,
      pollAttempts: 2,
      pollDelayMs: 0,
    })).rejects.toThrow("failed during projection polling");
  });
});
