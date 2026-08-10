import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createFirmUsersRouter,
  createLogger,
  type FirmUsersRepository,
} from "../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function withFirmUsersRouteServer(
  options: {
    repository?: FirmUsersRepository;
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
        createFirmUsersRouter({
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

describe("Firm users routes", () => {
  test("requires authenticated tenant and user context", async () => {
    await withFirmUsersRouteServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/firm/users`);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        title: "Authentication Required",
        status: 401,
      });
    });
  });

  test("returns the authenticated tenant's firm users", async () => {
    const calls: string[] = [];
    const repository: FirmUsersRepository = {
      async listByTenant({ tenantId }) {
        calls.push(tenantId);

        return [
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
            name: "Alex Rivera",
            email: "alex@example.com",
            role: "Firm Admin",
            status: "Inactive",
            lastLoginAt: null,
          },
        ];
      },
    };

    await withFirmUsersRouteServer(
      {
        repository,
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/firm/users`);

        expect(response.status).toBe(200);
        expect(calls).toEqual(["018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01"]);
        await expect(response.json()).resolves.toEqual([
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
            name: "Alex Rivera",
            email: "alex@example.com",
            role: "Firm Admin",
            status: "Inactive",
            lastLoginAt: null,
          },
        ]);
      },
    );
  });
});
