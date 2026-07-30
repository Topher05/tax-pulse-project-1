import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("DeductionsPage", () => {
  test("renders the scaffolded deductions screen", async () => {
    render(<RouterProvider router={createPulseRouter(["/deductions"])} />);

    expect(
      await screen.findByRole("heading", { name: "Deductions & Expenses", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deductions & Expenses" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add Deduction" })).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Deduction records" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getByText("Track deductible expenses to reduce your tax liability")).toBeInTheDocument();
  });

  test("opens the placeholder modal shell from the add button", async () => {
    render(<RouterProvider router={createPulseRouter(["/deductions"])} />);

    fireEvent.click(await screen.findByRole("button", { name: "Add Deduction" }));

    expect(await screen.findByRole("dialog", { name: "Add Deduction" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder modal shell for a later ticket.")).toBeInTheDocument();
  });
});
