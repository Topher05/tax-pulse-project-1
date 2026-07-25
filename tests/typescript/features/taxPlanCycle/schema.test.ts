import { describe, expect, test } from "vitest";
import { ZodError } from "zod";

import {
  taxPlanCycleSchema,
  type TaxPlanCycle,
} from "../../../../src/typescript/index.js";
import {
  expectedStageTransitionRows,
  expectedTaxPlanCycleRows,
  stageTransitionDbRowsSchema,
  taxPlanCycleDbRowsSchema,
  taxPlanCycleRepositoryQueueItemsSchema,
  wellFormedCycle,
} from "./taxPlanCycle.test.model.js";

describe("taxPlanCycleSchema", () => {
  test("parses a well-formed cycle and reuses the inferred type", () => {
    const parsedCycle: TaxPlanCycle = taxPlanCycleSchema.parse(wellFormedCycle);

    expect(parsedCycle).toEqual(wellFormedCycle);
  });

  test("rejects missing required fields", () => {
    const { id: _id, ...missingIdPayload } = wellFormedCycle;
    const { owner: _owner, ...missingOwnerPayload } = wellFormedCycle;

    expect(taxPlanCycleSchema.safeParse(missingIdPayload).success).toBe(false);
    expect(taxPlanCycleSchema.safeParse(missingOwnerPayload).success).toBe(
      false,
    );
  });

  test("rejects an unknown stage with a zod error", () => {
    const result = taxPlanCycleSchema.safeParse({
      ...wellFormedCycle,
      stage: "Unknown",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf(ZodError);
      expect(result.error.issues[0]?.path).toEqual(["stage"]);
    }
  });

  test("parses tax plan cycle db rows into the expected public shape", () => {
    expect(taxPlanCycleDbRowsSchema.parse(expectedTaxPlanCycleRows)).toEqual(
      expectedTaxPlanCycleRows,
    );
  });

  test("parses stage transition db rows into hydrated Date objects", () => {
    expect(stageTransitionDbRowsSchema.parse(expectedStageTransitionRows)).toEqual(
      expectedStageTransitionRows,
    );
  });

  test("parses repository queue items with overdue flags", () => {
    expect(
      taxPlanCycleRepositoryQueueItemsSchema.parse([
        {
          ...wellFormedCycle,
          is_overdue: true,
        },
      ]),
    ).toEqual([
      {
        ...wellFormedCycle,
        is_overdue: true,
      },
    ]);
  });
});
