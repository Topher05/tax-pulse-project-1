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
    { from: "Data Aggregation", to: "Modeling" },
    { from: "Modeling", to: "Review" },
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
    { from: "Intake", to: "Modeling" },
    { from: "Data Aggregation", to: "Review" },
    { from: "Review", to: "Executed" },
  ];

  test.each(skippedForwardTransitions)(
    "rejects skipped transition from $from to $to",
    ({ from, to }) => {
      expect(isLegalTaxPlanCycleStageTransition(from, to)).toBe(false);
    },
  );
});
