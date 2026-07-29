import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
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
});
