import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../routing/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("Plan Cycle Detail route", () => {
  test("renders tab and stage skeletons inside the existing shell", async () => {
    render(<RouterProvider router={createPulseRouter(["/plan-cycles/example"])} />);

    expect(await screen.findByRole("heading", { name: "Plan Cycle Detail" })).toBeInTheDocument();

    const main = screen.getByRole("main", { name: "Routed view content" });
    const tabList = within(main).getByRole("tablist", { name: "Plan cycle detail tabs" });

    expect(within(tabList).getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(tabList).getByRole("tab", { name: "Scenarios" })).toBeInTheDocument();
    expect(within(tabList).getByRole("tab", { name: "Comments" })).toBeInTheDocument();
    expect(within(tabList).getByRole("tab", { name: "Audit Trail" })).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "Intake" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(within(main).getByRole("button", { name: "Archived" })).toBeInTheDocument();
  });
});
