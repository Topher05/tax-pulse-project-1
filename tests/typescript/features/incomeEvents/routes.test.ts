import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { Request } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  buildIncomeEventMockRows,
  createApp,
  createIncomeEventsRouter,
  createLogger,
} from "../../../../src/typescript/index.js";

async function withRouter(
  registerRoutes: (app: ReturnType<typeof createApp>) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: createLogger({ level: "silent" }),
    registerRoutes,
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

const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02";

describe("createIncomeEventsRouter", () => {
  test("returns synthetic income events for the authenticated owning tenant", async () => {
    const expected = buildIncomeEventMockRows({
      caseId,
      dueDate: "2026-12-31",
    });
    const findByCaseId = vi.fn(async () => ({
      id: caseId,
      client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
      stage: "Modeling" as const,
      owner: "advisor-001",
      priority: "high" as const,
      due_date: "2026-12-31",
      on_hold: false,
    }));

    await withRouter(
      (app) => {
        app.use("/v1", (req, _res, next) => {
          (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
            id: tenantId,
          };
          (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
            id: "user-001",
          };
          next();
        });
        app.use(
          "/v1",
          createIncomeEventsRouter({
            taxPlanCycleRepository: { findByCaseId },
          }),
        );
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/cases/${caseId}/income-events`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(expected);
      },
    );

    expect(findByCaseId).toHaveBeenCalledWith({ tenantId, caseId });
  });

  test("returns 401 when the auth context is missing", async () => {
    await withRouter(
      (app) => {
        app.use(
          "/v1",
          createIncomeEventsRouter({
            taxPlanCycleRepository: { findByCaseId: async () => null },
          }),
        );
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/cases/${caseId}/income-events`);

        expect(response.status).toBe(401);
      },
    );
  });

  test("returns 404 when the case is outside the tenant scope", async () => {
    await withRouter(
      (app) => {
        app.use("/v1", (req, _res, next) => {
          (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
            id: tenantId,
          };
          (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
            id: "user-001",
          };
          next();
        });
        app.use(
          "/v1",
          createIncomeEventsRouter({
            taxPlanCycleRepository: { findByCaseId: async () => null },
          }),
        );
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/cases/${caseId}/income-events`);

        expect(response.status).toBe(404);
      },
    );
  });
});

