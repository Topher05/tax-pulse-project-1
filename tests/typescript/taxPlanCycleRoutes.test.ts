import { once } from "node:events";
import type { AddressInfo } from "node:net";

import express from "express";
import { describe, expect, test, vi } from "vitest";

import {
  createTaxPlanCycleRouter,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateInput,
  type ValidationErrorResponse,
} from "../../src/typescript/index.js";

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
  const app = express();
  app.use(express.json());
  app.use(createTaxPlanCycleRouter({ controller }));

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
  test("returns 400 with a structured validation error for malformed creates", async () => {
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
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Request body failed validation");
      expect(body.error.issues).toEqual(
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
});
