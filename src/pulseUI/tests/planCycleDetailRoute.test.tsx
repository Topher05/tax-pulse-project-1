import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../app/createPulseRouter.ts";

const emptyAuditResponse = {
  ok: true,
  json: () => Promise.resolve({ audit_entries: [] }),
} as Response;

beforeAll(() => {
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(emptyAuditResponse)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe("Plan Cycle Detail route", () => {
  test("renders the Overview tab inside the existing shell", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    expect(await screen.findByRole("heading", { name: "Cycle Details", level: 1 })).toBeInTheDocument();

    const main = screen.getByRole("main", { name: "Routed view content" });
    const tabList = within(main).getByRole("tablist", { name: "Plan cycle detail tabs" });
    const fetchMock = vi.mocked(fetch);

    expect(within(tabList).getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(tabList).getByRole("tab", { name: "Scenarios" })).toBeInTheDocument();
    expect(within(tabList).getByRole("tab", { name: "Comments" })).toBeInTheDocument();
    expect(within(tabList).getByRole("tab", { name: "Audit Trail" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "Review" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(within(main).getByRole("button", { name: "Archived" })).toBeInTheDocument();

    expect(within(main).getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(within(main).getByText("2026 Q4")).toBeInTheDocument();
    expect(within(main).getByText("$18,400")).toBeInTheDocument();
    expect(
      within(main).getByText(
        "Accelerate charitable contributions before year-end and harvest short-term losses.",
      ),
    ).toBeInTheDocument();
    expect(within(main).getByText("AMT exposure")).toBeInTheDocument();
    expect(within(main).getByText("Missing brokerage statement")).toBeInTheDocument();

    const caseProperties = within(main)
      .getByRole("heading", { name: "Case Properties" })
      .closest("aside");

    expect(caseProperties).not.toBeNull();
    expect(within(caseProperties as HTMLElement).getByText("Avery Advisor")).toBeInTheDocument();
    expect(within(caseProperties as HTMLElement).getByText("Riley Reviewer")).toBeInTheDocument();
    expect(within(caseProperties as HTMLElement).getByText("2026-07-20")).toBeInTheDocument();
    expect(within(caseProperties as HTMLElement).getByText("2026-08-15")).toBeInTheDocument();
    expect(within(caseProperties as HTMLElement).getByText("No")).toBeInTheDocument();
    expect(within(caseProperties as HTMLElement).getByText("High")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("renders an empty comments state and preserves draft input without adding a comment", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    const main = await screen.findByRole("main", { name: "Routed view content" });
    fireEvent.click(within(main).getByRole("tab", { name: "Comments" }));

    expect(within(main).getByRole("heading", { name: "No comments yet" })).toBeInTheDocument();
    expect(
      within(main).getByText("Start the discussion by adding a case comment."),
    ).toBeInTheDocument();
    expect(within(main).queryByRole("list", { name: "Case comments" })).not.toBeInTheDocument();

    fireEvent.change(within(main).getByRole("textbox", { name: "Comment draft" }), {
      target: { value: "Schedule client approval prep once the revised estimate is ready." },
    });

    expect(within(main).getByRole("textbox", { name: "Comment draft" })).toHaveValue(
      "Schedule client approval prep once the revised estimate is ready.",
    );
    expect(within(main).queryByRole("list", { name: "Case comments" })).not.toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "No comments yet" })).toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "Loading comments" })).not.toBeInTheDocument();
  });

  test("loads and renders a read-only redacted audit trail by case ID", async () => {
    let resolveAuditResponse: (response: Response) => void = () => {};
    const auditResponsePromise = new Promise<Response>((resolve) => {
      resolveAuditResponse = resolve;
    });
    const fetchMock = vi.fn(() => auditResponsePromise);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RouterProvider
        router={createPulseRouter(["/cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01"])}
      />,
    );

    const main = await screen.findByRole("main", { name: "Routed view content" });
    fireEvent.click(within(main).getByRole("tab", { name: "Audit Trail" }));

    expect(within(main).getByRole("heading", { name: "Loading audit trail" })).toBeInTheDocument();

    resolveAuditResponse({
      ok: true,
      json: () =>
        Promise.resolve({
          audit_entries: [
            {
              id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d71",
              case_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
              actor: "advisor-001",
              action: "income amount [REDACTED_AMOUNT] recorded",
              outcome: "deduction amount [REDACTED_AMOUNT] accepted",
              occurred_at: "2026-07-20T14:00:00.000Z",
            },
          ],
        }),
    } as Response);
    const auditTrail = await within(main).findByRole("list", { name: "Read-only audit entries" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/v1/tax-plan-cycles/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01/audit-entries",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(within(auditTrail).getByText("income amount [REDACTED_AMOUNT] recorded")).toBeInTheDocument();
    expect(within(auditTrail).getByText("deduction amount [REDACTED_AMOUNT] accepted")).toBeInTheDocument();
    expect(within(auditTrail).getByText("advisor-001")).toBeInTheDocument();
    expect(within(auditTrail).getByText("2026-07-20T14:00:00.000Z")).toBeInTheDocument();
    expect(within(main).queryByText("$125,000")).not.toBeInTheDocument();
    expect(within(main).queryByText("$18,500")).not.toBeInTheDocument();
    expect(within(main).queryByText("income amount 125000 recorded")).not.toBeInTheDocument();
    expect(within(main).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  test("renders an empty audit trail when the case has no audit entries", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    const main = await screen.findByRole("main", { name: "Routed view content" });
    fireEvent.click(within(main).getByRole("tab", { name: "Audit Trail" }));

    expect(await within(main).findByRole("heading", { name: "No audit entries yet" })).toBeInTheDocument();
    expect(
      within(main).getByText("Workflow history will appear after the first recorded case action."),
    ).toBeInTheDocument();
    expect(within(main).queryByRole("list", { name: "Read-only audit entries" })).not.toBeInTheDocument();
    expect(within(main).queryByText("$125,000")).not.toBeInTheDocument();
    expect(within(main).queryByText("$18,500")).not.toBeInTheDocument();
    expect(within(main).queryByText("[redacted amount]")).not.toBeInTheDocument();
    expect(within(main).queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    expect(within(main).queryByRole("heading", { name: "Loading audit trail" })).not.toBeInTheDocument();
  });

  test("renders an audit trail error state when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        } as Response),
      ),
    );
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    const main = await screen.findByRole("main", { name: "Routed view content" });
    fireEvent.click(within(main).getByRole("tab", { name: "Audit Trail" }));

    expect(
      await within(main).findByRole("heading", { name: "Audit trail unavailable" }),
    ).toBeInTheDocument();
    expect(
      within(main).getByText("The audit trail could not be loaded. Try refreshing the case."),
    ).toBeInTheDocument();
    expect(within(main).queryByRole("list", { name: "Read-only audit entries" })).not.toBeInTheDocument();
  });
});
