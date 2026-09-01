import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { readFileSync } from "node:fs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";
import * as caseApi from "../../shared/caseApi.ts";
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
type DetailsView = Awaited<ReturnType<typeof detailQueries.fetchTaxPlanCycleDetails>>;

interface RenderDetailsOptions {
  readonly details?: readonly DetailsView[];
  readonly comments?: CommentRows;
  readonly commentsPromise?: Promise<CommentRows>;
  readonly auditEntries?: AuditRows;
  readonly auditEntriesPromise?: Promise<AuditRows>;
}

function renderDetails({
  details,
  comments,
  commentsPromise,
  auditEntries,
  auditEntriesPromise,
}: RenderDetailsOptions = {}) {
  const detailsMock = vi.spyOn(detailQueries, "fetchTaxPlanCycleDetails");
  const detailSequence =
    details ?? [
      {
        caseId: "TP-24018",
        client: "North Shore Family Office",
        stage: "Review",
        owner: "Maya Reed",
        priority: "High",
        dueDate: "May 12, 2026",
        scenarioCount: 2,
        onHold: false,
        overdue: true,
        taxpayerIdentifierValidation: {
          verifiedName: "North Shore Family Office",
          provider: "tivs",
        },
      },
    ];

  detailSequence.forEach((detail) => {
    detailsMock.mockResolvedValueOnce(detail);
  });
  detailsMock.mockResolvedValue(detailSequence[detailSequence.length - 1]!);

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
  const postCommentSpy = vi
    .spyOn(detailQueries, "postTaxPlanCycleComment")
    .mockResolvedValue({
      id: "comment-posted-001",
      initials: "MR",
      author: "Maya Reed",
      when: "Aug 31, 2026, 11:08 AM",
      text: "Review quarterly estimate assumptions.",
    });
  const patchSpy = vi.spyOn(caseApi, "caseApiPatchJson");
  const assistSpy = vi.spyOn(caseApi, "caseApiPostJson").mockResolvedValue({
    explanation: "Grounded explanation.",
    citations: [],
  });

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );

  return { assistSpy, detailsMock, patchSpy, postCommentSpy };
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
    expect(stageStepper).toHaveAttribute("tabindex", "0");
    expect(within(stageStepper).getByText("Review").closest("[aria-current='step']")).toBe(
      stageStepper.querySelector("[aria-current='step']"),
    );
    expect(within(stageStepper).getByText("Archived")).toBeInTheDocument();
    expect(within(stageStepper).queryByRole("button", { name: /Review/ })).not.toBeInTheDocument();
  });

  test("renders overview and case properties content after the case loads", async () => {
    renderDetails();

    expect(await screen.findByText("Q2 2026 (April-June)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Case Properties" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run new scenario" })).toBeInTheDocument();
  });

  test("opens the assistant with derived case context and no initial question", async () => {
    const { assistSpy } = renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Open RAG assistant" }));

    await waitFor(() => {
      expect(assistSpy).toHaveBeenCalledWith(
        "/v1/tax-plan-cycles/TP-24018/assist",
        {
          recommendation_context: {
            recommendation:
              "Tax Plan Cycle in Review case owned by Maya Reed with a High priority for the taxpayer North Shore Family Office from tivs",
          },
        },
        expect.any(Function),
      );
    });
    expect(await screen.findByText("Grounded explanation.")).toBeInTheDocument();
    expect(screen.queryByText("Advisor prompt")).not.toBeInTheDocument();
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

  test("submits comments through the backend and clears the draft after refetch", async () => {
    const { postCommentSpy } = renderDetails({ comments: [] });

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));
    const commentBox = await screen.findByRole("textbox", { name: "Comment draft" });
    fireEvent.change(commentBox, {
      target: { value: "  Review quarterly estimate assumptions.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(
        "TP-24018",
        "Review quarterly estimate assumptions.",
        expect.any(Function),
      );
    });
    await waitFor(() => expect(commentBox).toHaveValue(""));
  });

  test("disables blank and pending comment submissions", async () => {
    const { postCommentSpy } = renderDetails({
      comments: [],
    });
    postCommentSpy.mockReturnValueOnce(new Promise(() => undefined));

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));

    const postButton = await screen.findByRole("button", { name: "Post" });
    expect(postButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Comment draft" }), {
      target: { value: "Submit once." },
    });
    fireEvent.click(postButton);

    expect(await screen.findByRole("button", { name: "Posting..." })).toBeDisabled();
    expect(postCommentSpy).toHaveBeenCalledTimes(1);
  });

  test("retains the comment draft and shows an error when submit fails", async () => {
    const { postCommentSpy } = renderDetails({ comments: [] });
    postCommentSpy.mockRejectedValueOnce(new Error("Write failed."));

    fireEvent.click(await screen.findByRole("tab", { name: "Comments" }));
    const commentBox = await screen.findByRole("textbox", { name: "Comment draft" });
    fireEvent.change(commentBox, { target: { value: "Keep this draft." } });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByText("Comment failed")).toBeInTheDocument();
    expect(commentBox).toHaveValue("Keep this draft.");
    expect(screen.getByText("Comment could not be saved. Please try again.")).toBeInTheDocument();
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

  test("renders the stage stepper as display-only backend state", async () => {
    renderDetails();

    const stageStepper = await screen.findByLabelText("Case stage progression");

    expect(within(stageStepper).getByText("Review").closest("[aria-current='step']")).toBe(
      stageStepper.querySelector("[aria-current='step']"),
    );
    expect(within(stageStepper).queryByRole("button", { name: /Modeling/ })).not.toBeInTheDocument();
    expect(within(stageStepper).getByText("Modeling")).toBeInTheDocument();

    const css = readFileSync("pages/taxPlanCycle/Details.module.css", "utf8");
    expect(css).toContain("grid-auto-flow: column");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("scroll-snap-type: inline proximity");
  });

  test("keeps the desktop case tabs at their intrinsic content height", async () => {
    renderDetails();

    expect(await screen.findByRole("tablist", { name: "Case tabs" })).toBeInTheDocument();

    const css = readFileSync("pages/taxPlanCycle/Details.module.css", "utf8");
    expect(css).toMatch(/\.mainColumn\s*{[^}]*align-content: start;/s);
    expect(css).toMatch(/\.mainColumn\s*{[^}]*align-self: start;/s);
    expect(css).toMatch(/\.tabBar\s*{[^}]*align-self: start;/s);
  });

  test("shows an error toast for the reassign placeholder action", async () => {
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Reassign" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Reassign");
    expect(screen.getByRole("alert")).toHaveTextContent("Implementation Details TBD.");
  });

  test("shows an info toast for the hold placeholder action", async () => {
    renderDetails();

    fireEvent.click(await screen.findByRole("button", { name: "Hold" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Hold");
    expect(screen.getByRole("status")).toHaveTextContent("Implementation Details TBD.");
  });

  test("shows a transition success toast and refreshes the displayed stage after advancing", async () => {
    const nextDetails: DetailsView = {
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Client Approval",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      scenarioCount: 2,
      onHold: false,
      overdue: true,
    };
    const { detailsMock, patchSpy } = renderDetails({
      details: [
        {
          caseId: "TP-24018",
          client: "North Shore Family Office",
          stage: "Review",
          owner: "Maya Reed",
          priority: "High",
          dueDate: "May 12, 2026",
          scenarioCount: 2,
          onHold: false,
          overdue: true,
        },
        nextDetails,
      ],
    });

    patchSpy.mockResolvedValueOnce({ stage: nextDetails.stage });

    fireEvent.click(await screen.findByRole("button", { name: "Advance Stage" }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    expect(patchSpy).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/TP-24018/transition",
      { to_stage: "Client Approval" },
      expect.any(Function),
    );

    await waitFor(() => expect(detailsMock).toHaveBeenCalledTimes(2));

    const stageStepper = await screen.findByLabelText("Case stage progression");
    expect(within(stageStepper).getByText("Client Approval").closest("[aria-current='step']")).toBe(
      stageStepper.querySelector("[aria-current='step']"),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Stage Advanced");
    expect(screen.getByRole("status")).toHaveTextContent("transition successful");
  });

  test("shows an error toast when a transition is rejected", async () => {
    const { patchSpy } = renderDetails();

    patchSpy.mockRejectedValueOnce(
      new caseApi.CaseApiError(
        403,
        JSON.stringify({
          title: "Forbidden",
          detail: "The current role is not authorized to perform this transition.",
        }),
      ),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Advance Stage" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The current role is not authorized to perform this transition.",
    );
  });
});
