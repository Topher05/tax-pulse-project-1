import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { describe, expect, test } from "vitest";

import {
  TAXPULSE_COST_UNITS_HEADER,
  createApp,
  createCostAccountingMiddleware,
  createLogger,
} from "../../../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

async function withCostAccountingServer(
  options: Parameters<typeof createCostAccountingMiddleware>[0],
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (server) => {
      server.use(createCostAccountingMiddleware(options));
      server.get("/v1/tax-plan-cycles/:caseId", (_req, res) => {
        res.status(200).json({ ok: true });
      });
      server.post("/v1/tax-plan-cycles", (_req, res) => {
        res.status(202).json({ ok: true });
      });
      server.get("/custom-cost", (_req, res) => {
        res.status(200).json({ ok: true });
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

describe("createCostAccountingMiddleware", () => {
  test("sets one cost unit for Tax Plan Cycle reads", async () => {
    await withCostAccountingServer({}, async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01`,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("1");
    });
  });

  test("sets two cost units for Tax Plan Cycle creates", async () => {
    await withCostAccountingServer({}, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/tax-plan-cycles`, {
        method: "POST",
      });

      expect(response.status).toBe(202);
      expect(response.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("2");
    });
  });

  test("supports a custom cost resolver", async () => {
    await withCostAccountingServer(
      {
        resolveCostUnits: ({ method, path }) =>
          method === "GET" && path === "/custom-cost" ? 7 : undefined,
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/custom-cost`);

        expect(response.status).toBe(200);
        expect(response.headers.get(TAXPULSE_COST_UNITS_HEADER)).toBe("7");
      },
    );
  });
});
