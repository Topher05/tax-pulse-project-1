import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "./bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "./bootstrap/tableTestUtils.js";
import { sampleCycleIds } from "./taxPlanCycle/taxPlanCycle.test.model.js";

describe("scenario migration", () => {
  test("creates a scenario table linked to a tax plan cycle", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const structure = await getTableStructure(client, "scenario");

      expect(structure.columns).toEqual([
        "id",
        "case_id",
        "name",
        "typed_figures",
        "computed_result",
        "created_at",
      ]);
      expect(structure.columnTypes).toEqual({
        id: "uuid",
        case_id: "uuid",
        name: "text",
        typed_figures: "jsonb",
        computed_result: "jsonb",
        created_at: "timestamp with time zone",
      });
      expect(structure.constraints.scenario_id_pk?.type).toBe("p");
      expect(structure.constraints.scenario_case_id_fk?.type).toBe("f");
      expect(structure.indexes).toContain("scenario_case_id_name_key");
      expect(structure.indexes).toContain("scenario_case_id_idx");
      expect(structure.rowCount).toBe(0);

      await client.query(
        `
          INSERT INTO scenario (case_id, name, typed_figures, computed_result)
          VALUES ($1, $2, $3::jsonb, $4::jsonb)
        `,
        [
          sampleCycleIds[0],
          "Maximize deductions",
          JSON.stringify({
            income: 250000,
            deductions: 30000,
            state: "CA",
            filing_status: "married_filing_jointly",
          }),
          JSON.stringify({
            federal_liability: 45000,
            state_liability: 18000,
            effective_rate: 0.252,
            marginal_rate: 0.32,
            quarterly_estimate: 15750,
          }),
        ],
      );

      await expectPgError(
        client.query(
          `
            INSERT INTO scenario (case_id, name, typed_figures, computed_result)
            VALUES ($1, $2, $3::jsonb, $4::jsonb)
          `,
          [
            "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d99",
            "Unknown case",
            JSON.stringify({}),
            JSON.stringify({}),
          ],
        ),
        { code: "23503", constraint: "scenario_case_id_fk" },
      );
    });
  });
});
