import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

const renderQueue = () => {
  render(<RouterProvider router={createPulseRouter(["/cycles/queue"])} />);
};

describe("Tax Plan Cycle queue page", () => {
  test("renders the KPI cards and the tax plan cycle table", async () => {
    renderQueue();

    expect(await screen.findByText("Open Cycles")).toBeInTheDocument();
    expect(screen.getAllByText("Awaiting Review")).toHaveLength(3);
    expect(screen.getAllByText("Overdue")).toHaveLength(2);
    expect(screen.getAllByText("Presented This Week")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Tax Plan Cycle Cases" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Tax Plan Cycle Cases" });

    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(within(table).getByText("Updated Date")).toBeInTheDocument();
    expect(within(table).getByText("Action")).toBeInTheDocument();
    expect(within(table).getAllByRole("button", { name: "Open" })).toHaveLength(5);
  });

  test("open buttons route to the details placeholder", async () => {
    renderQueue();

    const table = await screen.findByRole("table", { name: "Tax Plan Cycle Cases" });
    fireEvent.click(within(table).getAllByRole("button", { name: "Open" })[0]!);

    expect(await screen.findByText("hello Details page 🚀")).toBeInTheDocument();
  });
});
