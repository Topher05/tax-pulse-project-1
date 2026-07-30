import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { Request } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createDeductionsRouter,
  createLogger,
  type ClientDeductionAggregationPayload,
  type DeductionController,
} from "../../../../src/typescript/index.js";

const samplePayload: ClientDeductionAggregationPayload = {
  clientId: "client-123",
  incomeEvents: [
    {
      source: "W-2 wages",
      amount: 125000,
      withholding: 24500,
    },
  ],
  deductions: [
    {
      id: "ded-001",
      date: "2026-07-30",
      description: "Client lunches and travel for business development 1",
      category: "Business Expense",
      amount: 18500,
    },
  ],
};

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

describe("createDeductionsRouter", () => {
  test("returns the typed client deductions payload for a client id", async () => {
    const controller: DeductionController = {
      read: vi.fn(async () => samplePayload),
    };

    await withRouter(
      (app) => {
        app.use("/v1", (req, _res, next) => {
          (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
            id: "tenant-001",
          };
          (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
            id: "user-001",
          };
          next();
        });
        app.use("/v1", createDeductionsRouter({ controller }));
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/clients/client-123/deductions`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual(samplePayload);
        expect(controller.read).toHaveBeenCalledWith({ clientId: "client-123" });
      },
    );
  });

  test("returns 401 when the auth context is missing", async () => {
    const controller: DeductionController = {
      read: vi.fn(async () => samplePayload),
    };

    await withRouter(
      (app) => {
        app.use("/v1", createDeductionsRouter({ controller }));
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/clients/client-123/deductions`);

        expect(response.status).toBe(401);
        expect(controller.read).not.toHaveBeenCalled();
      },
    );
  });
});
