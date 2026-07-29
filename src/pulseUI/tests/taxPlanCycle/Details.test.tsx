import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as detailQueries from "../../entities/taxPlanCycleQueries.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDetails() {
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

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
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

    const commentBox = await screen.findByRole("textbox", { name: "Comment draft" });
    fireEvent.change(commentBox, { target: { value: "Review quarterly estimate assumptions." } });

    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));

    expect(await screen.findByRole("textbox", { name: "Comment draft" })).toHaveValue(
      "Review quarterly estimate assumptions.",
    );
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
