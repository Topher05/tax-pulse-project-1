import "@testing-library/jest-dom/vitest";

import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { TestAuthProvider } from "../testAuth.tsx";

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe("DeductionsPage", () => {
  test("renders the scaffolded deductions screen", async () => {
    render(
      <TestAuthProvider>
        <RouterProvider router={createPulseRouter(["/deductions"])} />
      </TestAuthProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Deductions & Expenses", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deductions & Expenses" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add Deduction" })).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Deduction records" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(26);
    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Category" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tax Impact" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ACTION" })).toBeInTheDocument();
    expect(screen.getAllByText(getTodayDateString())).toHaveLength(25);
    expect(screen.getAllByText("Business Expense").length).toBeGreaterThan(0);
    expect(screen.getByText("-$780")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(25);
    expect(screen.getByText("Track deductible expenses to reduce your tax liability")).toBeInTheDocument();
    expect(screen.getByText("Estimated Tax Savings")).toBeInTheDocument();
    expect(screen.getByText("$950.55")).toBeInTheDocument();
    expect(screen.getByText("Deduction Method")).toBeInTheDocument();
    expect(screen.getByText("Standard ($12,500)")).toBeInTheDocument();
  });

  test("opens the placeholder modal shell from the add button", async () => {
    render(
      <TestAuthProvider>
        <RouterProvider router={createPulseRouter(["/deductions"])} />
      </TestAuthProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add Deduction" }));

    expect(await screen.findByRole("dialog", { name: "Add Deduction" })).toBeInTheDocument();
    expect(screen.getByText("Placeholder modal shell for a later ticket.")).toBeInTheDocument();
  });
});
