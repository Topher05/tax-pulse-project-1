import { describe, expect, test } from "vitest";

import { createBracketReferenceRepository } from "../../../src/typescript/bracketReferenceRepository.js";
import { withDockerDrizzleSeededDatabase } from "../bootstrap/migrationTestUtils.js";

describe("bracket reference repository", () => {
  test("returns ordered federal and state brackets for a filing status and state", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createBracketReferenceRepository(client);

      const brackets = await repository.findByFilingStatusAndState({
        filingStatus: "head_of_household",
        stateCode: "CA",
      });

      expect(brackets.federal).toHaveLength(7);
      expect(brackets.federal[0]).toEqual({
        taxYear: 2026,
        filingStatus: "head_of_household",
        rate: "0.1000",
        lowerBound: "0.00",
        upperBound: "17700.00",
      });
      expect(brackets.federal.at(-1)).toMatchObject({
        rate: "0.3700",
        lowerBound: "640600.00",
        upperBound: null,
      });

      expect(brackets.state).toHaveLength(9);
      expect(brackets.state[0]).toEqual({
        taxYear: 2025,
        filingStatus: "head_of_household",
        rate: "0.0100",
        lowerBound: "0.00",
        upperBound: "22173.00",
      });
      expect(brackets.state.at(-1)).toMatchObject({
        rate: "0.1230",
        lowerBound: "1010417.00",
        upperBound: null,
      });
    });
  });

  test("filters state brackets without changing the federal filing-status result", { timeout: 30000 }, async () => {
    await withDockerDrizzleSeededDatabase(async (client) => {
      const repository = createBracketReferenceRepository(client);

      const brackets = await repository.findByFilingStatusAndState({
        filingStatus: "married_filing_separately",
        stateCode: "NY",
      });

      expect(brackets.federal).toHaveLength(7);
      expect(brackets.federal.at(-1)).toMatchObject({
        lowerBound: "384350.00",
        upperBound: null,
      });
      expect(brackets.state).toEqual([]);
    });
  });
});
