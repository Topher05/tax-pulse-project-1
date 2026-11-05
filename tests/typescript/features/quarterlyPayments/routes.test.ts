import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { Request } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createLogger,
} from "../../../../src/typescript/index.js";
import { buildQuarterlyEstimateMockRows } from "../../../../src/typescript/features/quarterlyPayments/repositories/mockPayments.model.js";
import { createQuarterlyPaymentsRouter } from "../../../../src/typescript/features/quarterlyPayments/routes.js";

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

describe("createQuarterlyPaymentsRouter", () => {
  test("returns the mock-backed quarterly estimates array for the owning tenant", async () => {
    const payload = buildQuarterlyEstimateMockRows({
      caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
      dueDate: "2026-12-31",
    });

    await withRouter(
      (app) => {
        app.use("/v1", (req, _res, next) => {
          (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
          };
          (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
            id: "user-001",
          };
          next();
        });
        app.use(
          "/v1",
          createQuarterlyPaymentsRouter({
            taxPlanCycleRepository: {
              findByCaseId: async () => ({
                id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12",
                client_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
                stage: "Modeling" as const,
                owner: "advisor-001",
                priority: "high" as const,
                due_date: "2026-12-31",
                on_hold: false,
              }),
            },
          }),
        );
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12/quarterly-estimates`,
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(payload);
      },
    );
  });

  test("returns 401 when the auth context is missing", async () => {
    await withRouter(
      (app) => {
        app.use(
          "/v1",
          createQuarterlyPaymentsRouter({
            taxPlanCycleRepository: {
              findByCaseId: async () => null,
            },
          }),
        );
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12/quarterly-estimates`,
        );

        expect(response.status).toBe(401);
      },
    );
  });
});
