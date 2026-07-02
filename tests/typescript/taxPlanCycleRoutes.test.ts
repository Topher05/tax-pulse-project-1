import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createLogger,
  createTaxPlanCycleRouter,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
  type ValidationErrorResponse,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

const validCreateBody: TaxPlanCycleCreateInput = {
  stage: "Review",
  owner: "advisor-123",
  priority: "high",
  due_date: "2026-12-31",
  on_hold: false,
};

async function withRouteServer(
  controller: TaxPlanCycleCreateController,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(createTaxPlanCycleRouter({ controller }));
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("createTaxPlanCycleRouter", () => {
  test("returns 400 Problem Details for malformed creates", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));

    await withRouteServer({ create }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validCreateBody,
          stage: "Unknown",
          owner: "",
        }),
      });
      const body = (await response.json()) as ValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Request body failed validation.",
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["stage"] }),
          expect.objectContaining({ path: ["owner"] }),
        ]),
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("passes valid creates to the controller layer", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));

    await withRouteServer({ create }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({ accepted: true });
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledWith(validCreateBody);
    });
  });

  test("returns shared Problem Details when the controller rejects a create", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => {
      throw new ProblemHttpError({
        type: "https://taxpulse.example/problems/cycle-conflict",
        title: "Cycle Conflict",
        status: 409,
        detail: "The requested tax plan cycle is already locked.",
      });
    });

    await withRouteServer({ create }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validCreateBody),
      });

      expect(response.status).toBe(409);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/cycle-conflict",
        title: "Cycle Conflict",
        status: 409,
        detail: "The requested tax plan cycle is already locked.",
      });
      expect(create).toHaveBeenCalledTimes(1);
    });
  });
});
