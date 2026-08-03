import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { DeductionsPage } from "../../pages/deductions/DeductionsPage.tsx";

beforeAll(() => {
  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
});

describe("DeductionsPage", () => {
  test("renders placeholder deductions content without case gating", () => {
    render(<DeductionsPage />);

    expect(screen.getByRole("heading", { name: "Deductions & Expenses" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Case ID" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Select a case to load/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeEnabled();
    expect(screen.getByText("Deduction table wiring is disabled pending scrum-115.")).toBeInTheDocument();
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  test("opens the deduction modal without selecting a case", async () => {
    render(<DeductionsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Deduction" }));

    expect(await screen.findByRole("dialog", { name: "New Deduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeInTheDocument();
  });
});
