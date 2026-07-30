import { describe, expect, test } from "vitest";

import {
  buildQueueMetrics,
  computeMetric,
} from "../../pages/taxPlanCycle/Queue.tsx";

describe("queue metric helpers", () => {
  test("returns zero counts and a stable metric list for an empty queue", () => {
    const counts = computeMetric([]);

    expect(counts).toEqual({
      awaitingReviewCount: 0,
      overdueCount: 0,
      presentedThisWeekCount: 0,
    });
    expect(buildQueueMetrics(counts, 0)).toEqual([
      {
        label: "Open Cycles",
        value: "0",
        caption: "7 due this week",
      },
      {
        label: "Awaiting Review",
        value: "0",
        caption: "Awaiting Firm Admin Approval",
      },
      {
        label: "Overdue",
        value: "0",
        caption: "Needs attention today",
      },
      {
        label: "Presented This Week",
        value: "0",
        caption: "Avg Cycle: 4 days",
      },
    ]);
  });

  test("counts rows across the stage aliases used by the queue card", () => {
    const counts = computeMetric([
      {
        caseId: "TP-24018",
        client: "North Shore Family Office",
        stage: "Review",
        owner: "Maya Reed",
        priority: "High",
        dueDate: "May 12, 2026",
        updatedDate: "May 11, 2026",
        overdue: true,
      },
      {
        caseId: "TP-24021",
        client: "Harbor Point Advisors",
        stage: "Awaiting Review",
        owner: "Jordan Kim",
        priority: "Medium",
        dueDate: "Jun 03, 2026",
        updatedDate: "May 29, 2026",
        overdue: false,
      },
      {
        caseId: "TP-24033",
        client: "Summit View Partners",
        stage: "Executed",
        owner: "Noah Patel",
        priority: "High",
        dueDate: "Jun 09, 2026",
        updatedDate: "Jun 01, 2026",
        overdue: false,
      },
      {
        caseId: "TP-24038",
        client: "Beacon Street Group",
        stage: "Presented",
        owner: "Isla Torres",
        priority: "Medium",
        dueDate: "Jun 12, 2026",
        updatedDate: "Jun 04, 2026",
        overdue: false,
      },
    ]);

    expect(counts).toEqual({
      awaitingReviewCount: 2,
      overdueCount: 1,
      presentedThisWeekCount: 2,
    });
    expect(buildQueueMetrics(counts, 4)[0]).toMatchObject({
      label: "Open Cycles",
      value: "4",
    });
  });
});
