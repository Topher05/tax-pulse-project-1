import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { Request } from "express";
import { describe, expect, test } from "vitest";

import {
  createApp,
  createDeductionRepository,
  createDeductionsRouter,
  createLogger,
} from "../../../../src/typescript/index.js";
import {
  taxPlanCycleRows,
  tenantRows,
} from "../../../../src/typescript/shared/database/seed.model.js";
import { applySeed } from "../../../../src/typescript/shared/database/seed.js";
import { withDrizzleTestSchema } from "../../bootstrap/migrationTestUtils.js";

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

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("createDeductionsRouter", () => {
  test(
    "returns the seeded deduction rows for the authenticated tenant",
    { timeout: 60000 },
    async () => {
      await withDrizzleTestSchema(async (client) => {
        await applySeed(client);
        const repository = createDeductionRepository(client);
        const expected = await repository.listByCase({
          tenantId: tenantRows[1].id,
          caseId: taxPlanCycleRows[1].id,
        });

        await withRouter(
          (app) => {
            app.use("/v1", (req, _res, next) => {
              (req as Request & { tenant: { id: string }; user: { id: string } }).tenant = {
                id: tenantRows[1].id,
              };
              (req as Request & { tenant: { id: string }; user: { id: string } }).user = {
                id: "user-001",
              };
              next();
            });
            app.use("/v1", createDeductionsRouter({ repository }));
          },
          async (baseUrl) => {
            const response = await fetch(
              `${baseUrl}/v1/cases/${taxPlanCycleRows[1].id}/deductions`,
            );

            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toEqual(expected);
          },
        );
      });
    },
  );

  test("returns 401 when the auth context is missing", async () => {
    await withDrizzleTestSchema(async (client) => {
      await applySeed(client);
      const repository = createDeductionRepository(client);

      await withRouter(
        (app) => {
          app.use("/v1", createDeductionsRouter({ repository }));
        },
        async (baseUrl) => {
          const response = await fetch(
            `${baseUrl}/v1/cases/${taxPlanCycleRows[1].id}/deductions`,
          );

          expect(response.status).toBe(401);
        },
      );
    });
  });
});
