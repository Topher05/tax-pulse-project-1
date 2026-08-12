import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createLogger,
  createPlatformAdministrationRouter,
  PlatformTenantUserEmailConflictError,
  type PlatformAdministrationRepository,
} from "../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function withPlatformAdministrationRouteServer(
  options: {
    repository?: PlatformAdministrationRepository;
    userId?: string;
    role?: "Firm Admin" | "Advisor" | "Client" | "TaxPulse Platform Admin";
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const attachRequestContext: RequestHandler = (req, _res, next) => {
    if (options.userId) {
      req.user = {
        id: options.userId,
        role: options.role,
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
        createPlatformAdministrationRouter({
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

describe("Platform administration routes", () => {
  test("requires authenticated platform admin context", async () => {
    await withPlatformAdministrationRouteServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/administration/tenants-users`);

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        title: "Authentication Required",
        status: 401,
      });
    });
  });

  test("rejects non-platform-admin callers", async () => {
    const repository: PlatformAdministrationRepository = {
      async listTenantsWithUsers() {
        throw new Error("Non-platform admins should not reach the repository.");
      },
      async createTenantUser() {
        throw new Error("Non-platform admins should not reach the repository.");
      },
    };

    await withPlatformAdministrationRouteServer(
      {
        repository,
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        role: "Firm Admin",
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/administration/tenants-users`);

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
          title: "Platform Authorization Required",
          status: 403,
        });
      },
    );
  });

  test("returns tenants with sectioned users for platform admins", async () => {
    const repository: PlatformAdministrationRepository = {
      async listTenantsWithUsers() {
        return [
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
            name: "North Shore Advisors",
            loginSlug: "north-shore-advisors",
            isActive: true,
            users: [
              {
                id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
                name: "Alex Rivera",
                email: "alex@example.com",
                role: "Firm Admin",
                status: "Inactive",
                lastLoginAt: null,
              },
            ],
          },
        ];
      },
      async createTenantUser() {
        throw new Error("User creation is not used by this test.");
      },
    };

    await withPlatformAdministrationRouteServer(
      {
        repository,
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
        role: "TaxPulse Platform Admin",
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/v1/administration/tenants-users`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
            name: "North Shore Advisors",
            loginSlug: "north-shore-advisors",
            isActive: true,
            users: [
              {
                id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
                name: "Alex Rivera",
                email: "alex@example.com",
                role: "Firm Admin",
                status: "Inactive",
                lastLoginAt: null,
              },
            ],
          },
        ]);
      },
    );
  });

  test("creates a user under the chosen tenant", async () => {
    const calls: Array<{
      tenantId: string;
      displayName: string;
      email: string;
      role: string;
      status: string;
    }> = [];
    const repository: PlatformAdministrationRepository = {
      async listTenantsWithUsers() {
        return [];
      },
      async createTenantUser(input) {
        calls.push(input);

        return {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
          name: input.displayName,
          email: input.email,
          role: input.role,
          status: input.status,
          lastLoginAt: null,
        };
      },
    };

    await withPlatformAdministrationRouteServer(
      {
        repository,
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
        role: "TaxPulse Platform Admin",
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/administration/tenants/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01/users`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              displayName: "Jordan Client",
              email: "jordan.client@example.test",
              role: "Client",
              status: "Inactive",
            }),
          },
        );

        expect(response.status).toBe(201);
        expect(calls).toEqual([
          {
            tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
            displayName: "Jordan Client",
            email: "jordan.client@example.test",
            role: "Client",
            status: "Inactive",
          },
        ]);
        await expect(response.json()).resolves.toMatchObject({
          name: "Jordan Client",
          email: "jordan.client@example.test",
          role: "Client",
          status: "Inactive",
          lastLoginAt: null,
        });
      },
    );
  });

  test("returns duplicate-email conflicts from the create command", async () => {
    const repository: PlatformAdministrationRepository = {
      async listTenantsWithUsers() {
        return [];
      },
      async createTenantUser() {
        throw new PlatformTenantUserEmailConflictError();
      },
    };

    await withPlatformAdministrationRouteServer(
      {
        repository,
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
        role: "TaxPulse Platform Admin",
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/administration/tenants/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01/users`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              displayName: "Alex Rivera",
              email: "alex@example.com",
              role: "Client",
              status: "Inactive",
            }),
          },
        );

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toMatchObject({
          title: "Email Already Registered",
          status: 409,
          code: "EMAIL_ALREADY_REGISTERED",
        });
      },
    );
  });

  test("returns not found when the chosen tenant does not exist", async () => {
    const repository: PlatformAdministrationRepository = {
      async listTenantsWithUsers() {
        return [];
      },
      async createTenantUser() {
        return null;
      },
    };

    await withPlatformAdministrationRouteServer(
      {
        repository,
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
        role: "TaxPulse Platform Admin",
      },
      async (baseUrl) => {
        const response = await fetch(
          `${baseUrl}/v1/administration/tenants/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d99/users`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              displayName: "Jordan Client",
              email: "jordan.client@example.test",
              role: "Client",
              status: "Inactive",
            }),
          },
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toMatchObject({
          title: "Tenant User Not Created",
          status: 404,
        });
      },
    );
  });
});
