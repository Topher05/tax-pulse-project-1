import { describe, expect, test } from "vitest";

import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";
import { expectPgError, getTableStructure } from "../bootstrap/tableTestUtils.js";

const expectedFederalColumns = [
  "id",
  "tax_year",
  "filing_status",
  "rate",
  "lower_bound",
  "upper_bound",
] as const;

const expectedStateColumns = [
  "id",
  "tax_year",
  "state_code",
  "filing_status",
  "rate",
  "lower_bound",
  "upper_bound",
] as const;

describe("bracket reference migrations", () => {
  test("creates the federal and state bracket table contracts", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const federalStructure = await getTableStructure(client, "federal_tax_bracket");
      const stateStructure = await getTableStructure(client, "state_tax_bracket");

      expect(federalStructure.columns).toEqual(expectedFederalColumns);
      expect(federalStructure.columnTypes).toMatchObject({
        id: "integer",
        tax_year: "integer",
        filing_status: "text",
        rate: "numeric",
        lower_bound: "numeric",
        upper_bound: "numeric",
      });
      expect(federalStructure.constraints.federal_tax_bracket_pkey?.type).toBe("p");
      expect(federalStructure.indexes).toContain(
        "federal_tax_bracket_year_status_lower_bound_key",
      );
      expect(federalStructure.indexes).toContain(
        "federal_tax_bracket_year_status_lower_bound_idx",
      );
      expect(federalStructure.rowCount).toBe(35);

      expect(stateStructure.columns).toEqual(expectedStateColumns);
      expect(stateStructure.columnTypes).toMatchObject({
        id: "integer",
        tax_year: "integer",
        state_code: "character varying",
        filing_status: "text",
        rate: "numeric",
        lower_bound: "numeric",
        upper_bound: "numeric",
      });
      expect(stateStructure.constraints.state_tax_bracket_pkey?.type).toBe("p");
      expect(stateStructure.indexes).toContain(
        "state_tax_bracket_year_state_status_lower_bound_key",
      );
      expect(stateStructure.indexes).toContain(
        "state_tax_bracket_year_state_status_lower_bound_idx",
      );
      expect(stateStructure.rowCount).toBe(45);
    });
  });

  test("prevents duplicate bracket lower bounds within a lookup scope", { timeout: 60000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      await client.query(`
        INSERT INTO federal_tax_bracket
          (tax_year, filing_status, rate, lower_bound, upper_bound)
        VALUES
          (2027, 'single', 0.10, 0.00, 12400.00)
      `);

      await expectPgError(
        client.query(`
          INSERT INTO federal_tax_bracket
            (tax_year, filing_status, rate, lower_bound, upper_bound)
          VALUES
            (2027, 'single', 0.12, 0.00, 50400.00)
        `),
        {
          code: "23505",
          constraint: "federal_tax_bracket_year_status_lower_bound_key",
        },
      );

      await client.query(`
        INSERT INTO state_tax_bracket
          (tax_year, state_code, filing_status, rate, lower_bound, upper_bound)
        VALUES
          (2027, 'CA', 'single', 0.01, 0.00, 10000.00)
      `);

      await expectPgError(
        client.query(`
          INSERT INTO state_tax_bracket
            (tax_year, state_code, filing_status, rate, lower_bound, upper_bound)
          VALUES
            (2027, 'CA', 'single', 0.02, 0.00, 25000.00)
          `),
        {
          code: "23505",
          constraint: "state_tax_bracket_year_state_status_lower_bound_key",
        },
      );
    });
  });
});
