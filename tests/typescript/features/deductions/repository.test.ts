import { describe, expect, test } from "vitest";

import {
  createDeductionRepository,
} from "../../../../src/typescript/index.js";
import {
  deductionRows,
  taxPlanCycleRows,
  tenantRows,
} from "../../../../src/typescript/shared/database/seed.model.js";
import { applySeed } from "../../../../src/typescript/shared/database/seed.js";
import { withDrizzleTestSchema } from "../../bootstrap/migrationTestUtils.js";

const databaseUrl = process.env.DATABASE_URL?.trim();
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase("createDeductionRepository", () => {
  test(
    "returns the seeded deduction rows for the owning tenant and case",
    { timeout: 60000 },
    async () => {
      await withDrizzleTestSchema(async (client) => {
        await applySeed(client);
        const repository = createDeductionRepository(client);
        const rows = await repository.listByCase({
          tenantId: tenantRows[1].id,
          caseId: taxPlanCycleRows[1].id,
        });

        expect(rows).toHaveLength(deductionRows.length);
        expect(rows[0]).toMatchObject({
          case_id: taxPlanCycleRows[1].id,
          date: "2026-07-16",
          description: "State filing fee",
          category: "Other",
          amount: "135.00",
          tax_impact: "33.75",
          deleted: false,
        });
        expect(rows[rows.length - 1]).toMatchObject({
          case_id: taxPlanCycleRows[1].id,
          date: "2026-07-30",
          description: "Business development travel and meals",
          category: "Business Expense",
          amount: "780.00",
          tax_impact: "195.00",
          deleted: false,
        });
      });
    },
  );

  test(
    "returns an empty list when the tenant does not own the case",
    { timeout: 60000 },
    async () => {
      await withDrizzleTestSchema(async (client) => {
        await applySeed(client);
        const repository = createDeductionRepository(client);
        const rows = await repository.listByCase({
          tenantId: tenantRows[0].id,
          caseId: taxPlanCycleRows[1].id,
        });

        expect(rows).toEqual([]);
      });
    },
  );

  test(
    "returns an empty list when the case has no deductions",
    { timeout: 60000 },
    async () => {
      await withDrizzleTestSchema(async (client) => {
        await applySeed(client);
        const repository = createDeductionRepository(client);
        const rows = await repository.listByCase({
          tenantId: tenantRows[0].id,
          caseId: taxPlanCycleRows[0].id,
        });

        expect(rows).toEqual([]);
      });
    },
  );
});
