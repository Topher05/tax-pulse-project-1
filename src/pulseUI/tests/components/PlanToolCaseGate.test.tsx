import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";

afterEach(() => {
  cleanup();
});

describe("PlanToolCaseGate", () => {
  test("renders status copy when the tax plan is missing", () => {
    render(<PlanToolCaseGate hasInvalidCaseId={false} toolName="deductions" />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select a tax plan to load deductions" })).toBeInTheDocument();
    expect(
      screen.getByText("Choose an accessible tax plan from the selector above before this tool loads or changes plan data."),
    ).toBeInTheDocument();
  });

  test("renders alert copy when the tax plan link is invalid", () => {
    render(<PlanToolCaseGate hasInvalidCaseId={true} toolName="scenarios" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Select a tax plan to load scenarios" })).toBeInTheDocument();
    expect(
      screen.getByText("This tax plan link is not valid. Choose an accessible tax plan from the selector above."),
    ).toBeInTheDocument();
  });
});
