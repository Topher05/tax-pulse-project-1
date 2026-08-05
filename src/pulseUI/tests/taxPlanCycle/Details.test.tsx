import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";
import * as detailQueries from "../../entities/taxPlanCycleQueries.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type CommentRows = Awaited<ReturnType<typeof detailQueries.fetchTaxPlanCycleComments>>;
type AuditRows = Awaited<ReturnType<typeof detailQueries.fetchTaxPlanCycleAuditEntries>>;

interface RenderDetailsOptions {
  readonly comments?: CommentRows;
  readonly commentsPromise?: Promise<CommentRows>;
  readonly auditEntries?: AuditRows;
  readonly auditEntriesPromise?: Promise<AuditRows>;
}

function renderDetails({
  comments,
  commentsPromise,
  auditEntries,
  auditEntriesPromise,
}: RenderDetailsOptions = {}) {
  vi.spyOn(detailQueries, "fetchTaxPlanCycleDetails").mockResolvedValue({
    caseId: "TP-24018",
    client: "North Shore Family Office",
    stage: "Review",
    owner: "Maya Reed",
    priority: "High",
    dueDate: "May 12, 2026",
    scenarioCount: 2,
    onHold: false,
    overdue: true,
  });
  vi.spyOn(detailQueries, "fetchTaxPlanCycleComments").mockReturnValue(
    commentsPromise ?? Promise.resolve(comments ?? [
      {
        id: "comment-001",
        initials: "DC",
        author: "Dana Cohen, CPA",
        when: "Today - 11:08",
        text: "I've narrowed it down to the combined Roth + DAF strategy.",
      },
    ]),
  );
  vi.spyOn(detailQueries, "fetchTaxPlanCycleAuditEntries").mockReturnValue(
    auditEntriesPromise ?? Promise.resolve(auditEntries ?? [
      {
        id: "audit-entry-001",
        actor: "Maya Reed",
        action: "Updated estimated tax to [REDACTED_AMOUNT]",
        outcome: "Audit entry stored with redacted financial figures.",
        occurredAt: "May 12, 2026, 2:30 PM",
      },
    ]),
  );

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

describe("Tax Plan Cycle details page", () => {
  test("renders the case header, tabs, and stage stepper", async () => {
    renderDetails();

    expect(
      await screen.findByRole("heading", {
        name: "North Shore Family Office - Q2 2026 Tax Plan",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Advance Stage/ })).toBeInTheDocument();

    const tabList = screen.getByRole("tablist", { name: "Case tabs" });
    expect(within(tabList).getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const stageStepper = screen.getByLabelText("Case stage progression");
    expect(within(stageStepper).getByRole("button", { name: /Review/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(within(stageStepper).getByRole("button", { name: /Archived/ })).toBeInTheDocument();
  });

  test("renders overview and case properties content after the case loads", async () => {
    renderDetails();

    expect(await screen.findByText("Q2 2026 (April-June)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Case Properties" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run new scenario" })).toBeInTheDocument();
  });

  test("switches tabs and preserves the comment draft when returning to Comments", async () => {
    renderDetails();

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));

    expect(await screen.findByText("Dana Cohen, CPA")).toBeInTheDocument();
    const commentBox = await screen.findByRole("textbox", { name: "Comment draft" });
    fireEvent.change(commentBox, { target: { value: "Review quarterly estimate assumptions." } });

    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));

    expect(await screen.findByRole("textbox", { name: "Comment draft" })).toHaveValue(
      "Review quarterly estimate assumptions.",
    );
  });

  test("renders the comments loading state", async () => {
    renderDetails({ commentsPromise: new Promise(() => undefined) });

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Loading comments...");
  });

  test("renders the comments empty state with the add-comment input", async () => {
    renderDetails({ comments: [] });

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));

    expect(await screen.findByText("No comments have been added for this case.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Comment draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeInTheDocument();
  });

  test("loads redacted audit entries when the Audit Trail tab is opened", async () => {
    renderDetails();

    fireEvent.click(await screen.findByRole("tab", { name: "Audit Trail" }));

    expect(await screen.findByText("Updated estimated tax to [REDACTED_AMOUNT]")).toBeInTheDocument();
    expect(screen.getByText("Audit entry stored with redacted financial figures.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Comment draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post" })).not.toBeInTheDocument();
    expect(detailQueries.fetchTaxPlanCycleAuditEntries).toHaveBeenCalledWith(
      "TP-24018",
      expect.any(Function),
    );
  });

  test("renders the audit trail loading state", async () => {
    renderDetails({ auditEntriesPromise: new Promise(() => undefined) });

    fireEvent.click(await screen.findByRole("tab", { name: "Audit Trail" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Loading audit trail...");
  });

  test("renders the audit trail empty state", async () => {
    renderDetails({ auditEntries: [] });

    fireEvent.click(await screen.findByRole("tab", { name: "Audit Trail" }));

    expect(
      await screen.findByText("No audit entries have been recorded for this case."),
    ).toBeInTheDocument();
  });

  test("updates the active stage when a step is clicked", async () => {
    renderDetails();

    const stageStepper = await screen.findByLabelText("Case stage progression");
    fireEvent.click(within(stageStepper).getByRole("button", { name: /Modeling/ }));

    expect(await within(stageStepper).findByRole("button", { name: /Modeling/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
