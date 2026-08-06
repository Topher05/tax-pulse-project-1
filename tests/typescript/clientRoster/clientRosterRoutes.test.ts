import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createClientRosterRouter,
  createLogger,
  type ClientRosterRepository,
} from "../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function withClientRosterRouteServer(
  options: {
    repository?: ClientRosterRepository;
    tenantId?: string;
    userId?: string;
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const attachRequestContext: RequestHandler = (req, _res, next) => {
    if (options.tenantId) {
      (req as typeof req & { tenant: { id: string } }).tenant = {
        id: options.tenantId,
      };
    }

    if (options.userId) {
      (req as typeof req & { user: { id: string } }).user = {
        id: options.userId,
      };
    }

    next();
  };
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      app.use(attachRequestContext);
      app.use(
        "/v1",
        createClientRosterRouter({
          repository: options.repository,
        }),
      );
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

describe("Client Roster routes", () => {
  test("requires authenticated tenant and user context", async () => {
    await withClientRosterRouteServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/clients`);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        title: "Authentication Required",
        status: 401,
      });
    });
  });

  test("returns the authenticated tenant's client roster", async () => {
    const calls: string[] = [];
    const repository: ClientRosterRepository = {
      async listByTenant({ tenantId }) {
        calls.push(tenantId);

        return [
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
            clientName: "Avery Chen",
            filingStatus: "Single - 1099",
            ytdIncome: 108_500,
            estimatedTax: 32_100,
            quarterlyStatus: "Q2 due Jun 15",
          },
        ];
      },
    };

    await withClientRosterRouteServer(
      {
        repository,
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/clients`);

        expect(response.status).toBe(200);
        expect(calls).toEqual(["018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01"]);
        await expect(response.json()).resolves.toEqual([
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e81",
            clientName: "Avery Chen",
            filingStatus: "Single - 1099",
            ytdIncome: 108_500,
            estimatedTax: 32_100,
            quarterlyStatus: "Q2 due Jun 15",
          },
        ]);
      },
    );
  });
});
