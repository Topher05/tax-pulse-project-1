import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { WorkflowStepper } from "../components/WorkflowStepper.tsx";

afterEach(() => {
  cleanup();
});

describe("WorkflowStepper", () => {
  test("renders every stage and marks the active stage in sequence", () => {
    render(
      <WorkflowStepper
        stages={["Intake", "Data Aggregation", "Modeling", "Review"]}
        activeStage="Modeling"
      />,
    );

    const stepper = screen.getByLabelText("Case stage progression");

    expect(within(stepper).getByText("Intake")).toBeInTheDocument();
    expect(within(stepper).getByText("Data Aggregation")).toBeInTheDocument();
    expect(within(stepper).getByText("Modeling")).toBeInTheDocument();
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
  });
});
