import { describe, expect, test } from "vitest";

import {
  taxPlanCycleDetailsQueryKey,
  taxPlanCycleQueueQueryKey,
} from "../../pages/taxPlanCycle/queries.ts";

describe("Tax Plan Cycle query keys", () => {
  test("uses an exact queue cache key", () => {
    expect(taxPlanCycleQueueQueryKey).toEqual(["taxPlanCycle", "queue"]);
  });

  test("uses an exact details cache key per case", () => {
    expect(taxPlanCycleDetailsQueryKey("TP-24018")).toEqual([
      "taxPlanCycle",
      "details",
      "TP-24018",
    ]);
  });
});
