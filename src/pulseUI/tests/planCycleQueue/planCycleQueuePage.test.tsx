import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

const renderPlanCycleQueue = () => {
  render(<RouterProvider router={createPulseRouter(["/plan-cycles"])} />);
};

describe("Plan Cycle Queue page", () => {
  test("renders the KPI cards above the table", async () => {
    renderPlanCycleQueue();

    expect(await screen.findByRole("heading", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Awaiting Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overdue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Presented This Week" })).toBeInTheDocument();
  });

  test("renders the queue rows with overdue badges on past-due cases", async () => {
    renderPlanCycleQueue();

    const table = await screen.findByRole("table", { name: "Plan Cycle Queue cases" });

    expect(within(table).getByText("TP-24018")).toBeInTheDocument();
    expect(within(table).getByText("North Shore Family Office")).toBeInTheDocument();
    expect(within(table).getAllByText("Overdue")).toHaveLength(2);
    expect(within(table).getByText("Case ID")).toBeInTheDocument();
    expect(within(table).getByText("Due date")).toBeInTheDocument();
  });
});
