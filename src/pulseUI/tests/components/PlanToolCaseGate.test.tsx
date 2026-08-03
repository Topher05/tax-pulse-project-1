import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";

afterEach(() => {
  cleanup();
});

describe("PlanToolCaseGate", () => {
  test("renders status copy when the case ID is missing", () => {
    render(<PlanToolCaseGate hasInvalidCaseId={false} toolName="deductions" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select a case to load deductions" })).toBeInTheDocument();
    expect(
      screen.getByText("Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data."),
    ).toBeInTheDocument();
  });

  test("renders alert copy when the case ID is invalid", () => {
    render(<PlanToolCaseGate hasInvalidCaseId={true} toolName="scenarios" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select a case to load scenarios" })).toBeInTheDocument();
    expect(
      screen.getByText("The case ID in the URL is not valid. Choose an accessible Tax Plan Cycle from the selector above."),
    ).toBeInTheDocument();
  });
});
