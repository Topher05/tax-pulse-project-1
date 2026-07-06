import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createLogger,
  createTaxPlanCycleRouter,
  type TaxPlanCycle,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
  type ValidationErrorResponse,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

const validCreateBody: TaxPlanCycleCreateInput = {
  client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e11",
  stage: "Review",
  owner: "advisor-123",
  priority: "high",
  due_date: "2026-12-31",
  on_hold: false,
};

const validReadCycle: TaxPlanCycle = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  ...validCreateBody,
};

const attachTenant: RequestHandler = (req, _res, next) => {
  (req as typeof req & { tenant: { id: string } }).tenant = {
    id: "tenant-001",
  };
  next();
};

async function withRouteServer(
  controller: TaxPlanCycleCreateController,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(attachTenant);
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
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
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
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
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
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
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

  test("returns a tenant-scoped cycle by case ID", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => validReadCycle);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01`,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(validReadCycle);
      expect(findByCaseId).toHaveBeenCalledTimes(1);
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  test("returns 404 Problem Details for an unknown case ID", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02`,
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/tax-plan-cycle-not-found",
        title: "Tax Plan Cycle Not Found",
        status: 404,
        detail: "No tax plan cycle was found for the requested case ID.",
      });
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      });
    });
  });

  test("returns 404 when a case exists outside the request tenant", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => null);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e03`,
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(findByCaseId).toHaveBeenCalledWith({
        tenantId: "tenant-001",
        caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e03",
      });
    });
  });

  test("returns 400 Problem Details for an invalid case ID path parameter", async () => {
    const create = vi.fn<TaxPlanCycleCreateController["create"]>(() => ({
      accepted: true,
    }));
    const findByCaseId = vi.fn<
      TaxPlanCycleCreateController["findByCaseId"]
    >(() => validReadCycle);

    await withRouteServer({ create, findByCaseId }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/tax-plan-cycles/%20`);
      const body = (await response.json()) as ValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        detail: "Request path parameters failed validation.",
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual([
        expect.objectContaining({ path: ["caseId"] }),
      ]);
      expect(findByCaseId).not.toHaveBeenCalled();
    });
  });
});
