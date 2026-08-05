import { afterEach, describe, expect, test, vi } from "vitest";

import * as caseApi from "../../shared/caseApi.ts";
import {
  fetchTaxPlanCycleAuditEntries,
  fetchTaxPlanCycleDetails,
  taxPlanCycleAuditEntriesQueryKey,
  taxPlanCycleCommentsQueryKey,
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

  test("uses an exact audit entries cache key per case", () => {
    expect(taxPlanCycleAuditEntriesQueryKey("TP-24018")).toEqual([
      "taxPlanCycle",
      "auditEntries",
      "TP-24018",
    ]);
  });

  test("uses an exact comments cache key per case", () => {
    expect(taxPlanCycleCommentsQueryKey("TP-24018")).toEqual([
      "taxPlanCycle",
      "comments",
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

describe("Tax Plan Cycle audit query mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("maps redacted audit entries from the backend response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce({
      audit_entries: [
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
          case_id: "TP-24018",
          actor: "Maya Reed",
          action: "Updated estimated tax to [REDACTED_AMOUNT]",
          outcome: "Transition denied",
          occurred_at: "2026-05-12T14:30:00.000Z",
        },
      ],
    });

    await expect(fetchTaxPlanCycleAuditEntries("TP-24018")).resolves.toEqual([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
        actor: "Maya Reed",
        action: "Updated estimated tax to [REDACTED_AMOUNT]",
        outcome: "Transition denied",
        occurredAt: "May 12, 2026, 2:30 PM",
      },
    ]);
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/TP-24018/audit-entries",
      undefined,
    );
  });
});
