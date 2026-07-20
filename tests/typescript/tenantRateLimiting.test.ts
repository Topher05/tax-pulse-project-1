import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test } from "vitest";

import {
  createApp,
  createLogger,
  createTenantRateLimitMiddleware,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function withRateLimitedServer(
  options: Parameters<typeof createTenantRateLimitMiddleware>[0],
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use((req, _res, next) => {
        const tenantId = req.header("x-tenant-id");

        if (tenantId) {
          req.tenant = { id: tenantId };
        }

        next();
      });
      server.use(createTenantRateLimitMiddleware(options));
      server.get("/protected", (req, res) => {
        res.status(200).json({ tenant_id: req.tenant?.id });
      });
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

function getProtected(baseUrl: string, tenantId: string): Promise<Response> {
  return fetch(`${baseUrl}/protected`, {
    headers: { "x-tenant-id": tenantId },
  });
}

describe("createTenantRateLimitMiddleware", () => {
  test("allows requests while the tenant remains under the limit", async () => {
    await withRateLimitedServer({ limit: 2, windowMs: 60_000 }, async (baseUrl) => {
      const first = await getProtected(baseUrl, "tenant-under-limit");
      const second = await getProtected(baseUrl, "tenant-under-limit");

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      await expect(second.json()).resolves.toEqual({
        tenant_id: "tenant-under-limit",
      });
    });
  });

  test("returns 429 Problem Details with Retry-After after the tenant exceeds the limit", async () => {
    let currentTime = 1_000;

    await withRateLimitedServer(
      { limit: 1, windowMs: 60_000, now: () => currentTime },
      async (baseUrl) => {
        const allowed = await getProtected(baseUrl, "tenant-limited");
        currentTime = 30_000;
        const limited = await getProtected(baseUrl, "tenant-limited");

        expect(allowed.status).toBe(200);
        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toBe("31");
        expect(limited.headers.get("content-type")).toContain(
          "application/problem+json",
        );
        await expect(limited.json()).resolves.toEqual({
          type: "https://taxpulse.example/problems/rate-limit-exceeded",
          title: "Rate Limit Exceeded",
          status: 429,
          detail:
            "The tenant rate limit has been exceeded. Retry after the current window resets.",
        });
      },
    );
  });

  test("resets a tenant counter after the window expires", async () => {
    let currentTime = 0;

    await withRateLimitedServer(
      { limit: 1, windowMs: 1_000, now: () => currentTime },
      async (baseUrl) => {
        const first = await getProtected(baseUrl, "tenant-reset");
        currentTime = 999;
        const limited = await getProtected(baseUrl, "tenant-reset");
        currentTime = 1_000;
        const reset = await getProtected(baseUrl, "tenant-reset");

        expect(first.status).toBe(200);
        expect(limited.status).toBe(429);
        expect(limited.headers.get("retry-after")).toBe("1");
        expect(reset.status).toBe(200);
      },
    );
  });

  test("isolates counters per tenant ID", async () => {
    await withRateLimitedServer({ limit: 1, windowMs: 60_000 }, async (baseUrl) => {
      const tenantAFirst = await getProtected(baseUrl, "tenant-a");
      const tenantASecond = await getProtected(baseUrl, "tenant-a");
      const tenantBFirst = await getProtected(baseUrl, "tenant-b");

      expect(tenantAFirst.status).toBe(200);
      expect(tenantASecond.status).toBe(429);
      expect(tenantBFirst.status).toBe(200);
    });
  });
});
