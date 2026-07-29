import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("Plan Cycle Detail route", () => {
  test("renders the Overview tab inside the existing shell", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    expect(await screen.findByRole("heading", { name: "Cycle Details", level: 1 })).toBeInTheDocument();

    const main = screen.getByRole("main", { name: "Routed view content" });
    const tabList = within(main).getByRole("tablist", { name: "Plan cycle detail tabs" });

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

  test("renders a read-only empty audit trail without exposing raw amounts", async () => {
    render(<RouterProvider router={createPulseRouter(["/cycles/example"])} />);

    const main = await screen.findByRole("main", { name: "Routed view content" });
    fireEvent.click(within(main).getByRole("tab", { name: "Audit Trail" }));

    expect(within(main).getByRole("heading", { name: "No audit entries yet" })).toBeInTheDocument();
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
});
