import { afterEach, describe, expect, test, vi } from "vitest";

import * as caseApi from "../../shared/caseApi.ts";
import {
  fetchTaxPlanCycleDetails,
  taxPlanCycleDetailsQueryKey,
  taxPlanCycleQueueQueryKey,
} from "../../entities/taxPlanCycleQueries.ts";

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

describe("Tax Plan Cycle detail query mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("defaults the scenario count when the backend omits scenarios", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce({
      id: "TP-24018",
      client_id: "North Shore Family Office",
      stage: "Review",
      owner: "Maya Reed",
      priority: "high",
      due_date: "2026-05-12",
      on_hold: false,
    });

    await expect(fetchTaxPlanCycleDetails("TP-24018")).resolves.toMatchObject({
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Review",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      scenarioCount: 0,
      onHold: false,
      overdue: false,
    });
  });
});
