import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { ToolHeader } from "../../components/ToolHeader.tsx";

afterEach(() => {
  cleanup();
});

describe("ToolHeader", () => {
  test("renders the title, description, and action", () => {
    render(
      <ToolHeader
        eyebrow="Plan tools"
        title="Deductions"
        description="Track deductions that are ready, planned, or under review."
        contextControl={<select aria-label="Client Case ID" />}
        action={<button type="button">Add Deduction</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Deductions" })).toBeInTheDocument();
    expect(screen.getByText("Track deductions that are ready, planned, or under review.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Client Case ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeInTheDocument();
  });
});
