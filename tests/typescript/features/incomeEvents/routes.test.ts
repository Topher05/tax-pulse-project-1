import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { Request } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  createApp,
  createIncomeEventsRouter,
  createLogger,
  type IncomeEventService,
} from "../../../../src/typescript/index.js";

const caseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d12";
const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02";
const row = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca218",
  case_id: caseId,
  date: "2026-08-31",
  source: "Acme Corporation",
  type: "w2" as const,
  amount: "900.00",
  withholding: "125.50",
};

async function request(
  service: IncomeEventService,
  path: string,
  init?: RequestInit,
  authenticated = true,
): Promise<Response> {
  const app = createApp({
    logger: createLogger({ level: "silent" }),
    registerRoutes(registeringApp) {
      if (authenticated) {
        registeringApp.use("/v1", (req, _res, next) => {
          (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
            id: tenantId,
          };
          (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
            id: "user-001",
          };
          next();
        });
      }
      registeringApp.use("/v1", createIncomeEventsRouter({ service }));
    },
  });
  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${address.port}/v1${path}`, init);
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("createIncomeEventsRouter", () => {
  test("returns persisted rows from the service", async () => {
    const listByCase = vi.fn(async () => [row]);
    const response = await request(
      { listByCase, create: async () => null },
      `/cases/${caseId}/income-events`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([row]);
    expect(listByCase).toHaveBeenCalledWith({ tenantId, caseId });
  });

  test("creates an income event", async () => {
    const create = vi.fn(async () => row);
    const response = await request(
      { listByCase: async () => [], create },
      `/cases/${caseId}/income-events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: " Acme Corporation ",
          type: "w2",
          amount: 900,
          withholding: 125.5,
        }),
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(row);
    expect(create).toHaveBeenCalledWith({
      tenantId,
      caseId,
      source: "Acme Corporation",
      type: "w2",
      amount: 900,
      withholding: 125.5,
    });
  });

  test("returns validation, authentication, and tenant-not-found problems", async () => {
    const service: IncomeEventService = {
      listByCase: async () => null,
      create: async () => null,
    };
    const invalid = await request(service, `/cases/${caseId}/income-events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "", type: "other", amount: -1, withholding: 0 }),
    });
    const unauthenticated = await request(
      service,
      `/cases/${caseId}/income-events`,
      undefined,
      false,
    );
    const missing = await request(service, `/cases/${caseId}/income-events`);

    expect(invalid.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
    expect(missing.status).toBe(404);
  });

  test("rejects malformed case IDs and unexpected create fields before calling the service", async () => {
    const listByCase = vi.fn(async () => [row]);
    const create = vi.fn(async () => row);
    const service: IncomeEventService = { listByCase, create };
    const invalidPath = await request(service, "/cases/not-a-uuid/income-events");
    const unexpectedField = await request(
      service,
      `/cases/${caseId}/income-events`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "Acme Corporation",
          type: "w2",
          amount: 900,
          withholding: 125.5,
          tenantId: "attacker-controlled-tenant",
        }),
      },
    );

    expect(invalidPath.status).toBe(400);
    expect(unexpectedField.status).toBe(400);
    expect(listByCase).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
