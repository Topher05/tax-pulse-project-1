import { describe, expect, test } from "vitest";

import { createIncomeEventRepository } from "../../../../src/typescript/index.js";
import {
  incomeEventRows,
  taxPlanCycleRows,
  tenantRows,
} from "../../../../src/typescript/shared/database/seed.model.js";
import { applySeed } from "../../../../src/typescript/shared/database/seed.js";
import {
  hasDrizzleTestDatabaseConfig,
  withDrizzleTestSchema,
} from "../../bootstrap/migrationTestUtils.js";

const describeDatabase = hasDrizzleTestDatabaseConfig() ? describe : describe.skip;

describeDatabase("createIncomeEventRepository", () => {
  test("lists seeded rows in date order for the owning tenant", { timeout: 60000 }, async () => {
    await withDrizzleTestSchema(async (client) => {
      await applySeed(client);
      const rows = await createIncomeEventRepository(client).listByCase({
        tenantId: tenantRows[1].id,
        caseId: taxPlanCycleRows[1].id,
      });

      expect(rows).toHaveLength(incomeEventRows.length);
      expect(rows?.map(({ date }) => date)).toEqual([
        "2026-01-31",
        "2026-04-30",
        "2026-06-30",
      ]);
      const { caseId, ...expectedSeedRow } = incomeEventRows[0];
      expect(rows?.[0]).toMatchObject({
        ...expectedSeedRow,
        case_id: caseId,
      });
    });
  });

  test("distinguishes an empty owned case from a cross-tenant case", { timeout: 60000 }, async () => {
    await withDrizzleTestSchema(async (client) => {
      await applySeed(client);
      const repository = createIncomeEventRepository(client);

      await expect(
        repository.listByCase({
          tenantId: tenantRows[0].id,
          caseId: taxPlanCycleRows[0].id,
        }),
      ).resolves.toEqual([]);
      await expect(
        repository.listByCase({
          tenantId: tenantRows[0].id,
          caseId: taxPlanCycleRows[1].id,
        }),
      ).resolves.toBeNull();
    });
  });

  test("creates normalized rows only for the owning tenant", { timeout: 60000 }, async () => {
    await withDrizzleTestSchema(async (client) => {
      await applySeed(client);
      const repository = createIncomeEventRepository(client);
      const input = {
        caseId: taxPlanCycleRows[1].id,
        date: "2026-08-31",
        source: "Acme Corporation",
        type: "w2" as const,
        amount: 900,
        withholding: 125.5,
      };

      await expect(
        repository.create({ tenantId: tenantRows[0].id, ...input }),
      ).resolves.toBeNull();
      await expect(
        repository.create({ tenantId: tenantRows[1].id, ...input }),
      ).resolves.toMatchObject({
        case_id: taxPlanCycleRows[1].id,
        date: "2026-08-31",
        source: "Acme Corporation",
        type: "w2",
        amount: "900.00",
        withholding: "125.50",
      });
    });
  });
});
