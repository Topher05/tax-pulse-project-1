import { describe, expect, test } from "vitest";

import {
  isLegalTaxPlanCycleStageTransition,
  type TaxPlanCycleStage,
} from "../../src/typescript/index.js";

describe("tax plan cycle stage transitions", () => {
  const legalForwardTransitions: Array<{
    from: TaxPlanCycleStage;
    to: TaxPlanCycleStage;
  }> = [
    { from: "Intake", to: "Data Aggregation" },
    { from: "Data Aggregation", to: "Modeling Advisor" },
    { from: "Modeling Advisor", to: "Review" },
    { from: "Review", to: "Client Approval" },
    { from: "Client Approval", to: "Executed" },
    { from: "Executed", to: "Archived" },
  ];

  test.each(legalForwardTransitions)(
    "allows $from to advance to $to",
    ({ from, to }) => {
      expect(isLegalTaxPlanCycleStageTransition(from, to)).toBe(true);
    },
  );

  const skippedForwardTransitions: Array<{
    from: TaxPlanCycleStage;
    to: TaxPlanCycleStage;
  }> = [
    { from: "Intake", to: "Modeling Advisor" },
    { from: "Data Aggregation", to: "Review" },
    { from: "Review", to: "Executed" },
  ];

  test.each(skippedForwardTransitions)(
    "rejects skipped transition from $from to $to",
    ({ from, to }) => {
      expect(isLegalTaxPlanCycleStageTransition(from, to)).toBe(false);
    },
  );

  test("allows Review to send back to Modeling Advisor", () => {
    expect(
      isLegalTaxPlanCycleStageTransition("Review", "Modeling Advisor"),
    ).toBe(true);
  });

  const illegalBackwardTransitions: Array<{
    from: TaxPlanCycleStage;
    to: TaxPlanCycleStage;
  }> = [
    { from: "Data Aggregation", to: "Intake" },
    { from: "Modeling Advisor", to: "Data Aggregation" },
    { from: "Review", to: "Data Aggregation" },
    { from: "Client Approval", to: "Review" },
    { from: "Executed", to: "Client Approval" },
    { from: "Archived", to: "Executed" },
  ];

  test.each(illegalBackwardTransitions)(
    "rejects backward transition from $from to $to",
    ({ from, to }) => {
      expect(isLegalTaxPlanCycleStageTransition(from, to)).toBe(false);
    },
  );

  const illegalNonStoryTransitions: Array<{
    from: TaxPlanCycleStage;
    to: TaxPlanCycleStage;
  }> = [
    { from: "Review", to: "Review" },
    { from: "Archived", to: "Review" },
  ];

  test.each(illegalNonStoryTransitions)(
    "rejects non-advancing transition from $from to $to",
    ({ from, to }) => {
      expect(isLegalTaxPlanCycleStageTransition(from, to)).toBe(false);
    },
  );
});
