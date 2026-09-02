import { describe, expect, test } from "vitest";

import { taxPlanCycleRows } from "../../../../src/typescript/shared/database/seed.model.js";
import { withDockerDrizzleSeededDatabase } from "../../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../../bootstrap/tableTestUtils.js";

describe("income-event migration", () => {
  test("creates the constrained income-event table", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "income_event");

      expect(structure.columns).toEqual([
        "id",
        "case_id",
        "date",
        "source",
        "type",
        "amount",
        "withholding",
      ]);
      expect(structure.columnTypes).toMatchObject({
        id: "uuid",
        case_id: "uuid",
        date: "date",
        source: "text",
        type: "USER-DEFINED",
        amount: "numeric",
        withholding: "numeric",
      });
      expect(structure.constraints.income_event_id_pk?.type).toBe("p");
      expect(structure.constraints.income_event_case_id_fk?.type).toBe("f");
      expect(structure.constraints.income_event_source_nonempty_check?.type).toBe("c");
      expect(structure.constraints.income_event_amount_nonnegative_check?.type).toBe("c");
      expect(structure.constraints.income_event_withholding_nonnegative_check?.type).toBe("c");
      expect(structure.indexes).toContain("income_event_case_id_date_idx");
      expect(structure.rowCount).toBe(3);
    });
  });

  test("rejects invalid values", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const insert = (source: string, type: string, amount: string, withholding: string) =>
        client.query(
          `INSERT INTO income_event (case_id, date, source, type, amount, withholding)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [taxPlanCycleRows[1].id, "2026-08-31", source, type, amount, withholding],
        );

      await expectPgError(insert(" ", "w2", "100", "10"), {
        code: "23514",
        constraint: "income_event_source_nonempty_check",
      });
      await expectPgError(insert("Acme", "w2", "-1", "10"), {
        code: "23514",
        constraint: "income_event_amount_nonnegative_check",
      });
      await expectPgError(insert("Acme", "w2", "100", "-1"), {
        code: "23514",
        constraint: "income_event_withholding_nonnegative_check",
      });
      await expectPgError(insert("Acme", "salary", "100", "10"), {
        code: "22P02",
      });
    });
  });
});
