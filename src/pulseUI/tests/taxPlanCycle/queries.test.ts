import { afterEach, describe, expect, test, vi } from "vitest";

import * as caseApi from "../../shared/caseApi.ts";
import {
  fetchTaxPlanCycleAuditEntries,
  fetchTaxPlanCycleComments,
  fetchTaxPlanCycleDetails,
  postTaxPlanCycleComment,
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
      taxpayer_identifier_validation: {
        verified_name: "North Shore Family Office",
        provider: "tivs",
      },
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
      overdue: true,
      taxpayerIdentifierValidation: {
        verifiedName: "North Shore Family Office",
        provider: "tivs",
      },
    });
  });

  test("omits taxpayer validation when it is absent from the backend response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce({
      id: "TP-24019",
      client_id: "Example Client",
      stage: "Intake",
      owner: "Example Advisor",
      priority: "medium",
      due_date: "2027-05-12",
      on_hold: false,
    });

    await expect(fetchTaxPlanCycleDetails("TP-24019")).resolves.not.toHaveProperty(
      "taxpayerIdentifierValidation",
    );
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
        occurredAt: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date("2026-05-12T14:30:00.000Z")),
      },
    ]);
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/TP-24018/audit-entries",
      undefined,
    );
  });
});

describe("Tax Plan Cycle comment query mapping", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches persisted comments and derives initials and display timestamps", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce({
      comments: [
        {
          id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f91",
          case_id: "TP-24018",
          actor_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
          actor_role: "Advisor",
          author_display_name: "Dana Cohen, CPA",
          body: "I've narrowed it down to the combined Roth + DAF strategy.",
          created_at: "2026-08-31T15:08:00.000Z",
        },
      ],
    });

    await expect(fetchTaxPlanCycleComments("TP-24018")).resolves.toEqual([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f91",
        initials: "DC",
        author: "Dana Cohen, CPA",
        when: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date("2026-08-31T15:08:00.000Z")),
        text: "I've narrowed it down to the combined Roth + DAF strategy.",
      },
    ]);
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/TP-24018/comments",
      undefined,
    );
  });

  test("posts comment bodies through the backend", async () => {
    vi.spyOn(caseApi, "caseApiPostJson").mockResolvedValueOnce({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9f92",
      case_id: "TP-24018",
      actor_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d75",
      actor_role: "Advisor",
      author_display_name: "Riley Park",
      body: "All Q1 data is in.",
      created_at: "2026-03-30T14:00:00.000Z",
    });

    await expect(postTaxPlanCycleComment("TP-24018", "All Q1 data is in.")).resolves.toMatchObject({
      initials: "RP",
      author: "Riley Park",
      text: "All Q1 data is in.",
    });
    expect(caseApi.caseApiPostJson).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/TP-24018/comments",
      { body: "All Q1 data is in." },
      undefined,
    );
  });
});
