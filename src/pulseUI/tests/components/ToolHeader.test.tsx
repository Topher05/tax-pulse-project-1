import "@testing-library/jest-dom/vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { ToolHeader } from "../../components/ToolHeader.tsx";

const toolHeaderCss = readFileSync(
  resolve(process.cwd(), "components/ToolHeader.module.css"),
  "utf8",
);

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
        contextControl={<select aria-label="Case ID" />}
        action={<button type="button">Add Deduction</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Deductions" })).toBeInTheDocument();
    expect(screen.getByText("Track deductions that are ready, planned, or under review.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Deduction" })).toBeInTheDocument();
  });

  test("renders the action before the context control", () => {
    render(
      <ToolHeader
        title="Deductions"
        contextControl={<select aria-label="Case ID" />}
        action={<button type="button">Add Deduction</button>}
      />,
    );

    const action = screen.getByRole("button", { name: "Add Deduction" });
    const contextControl = screen.getByRole("combobox", { name: "Case ID" });

    expect(
      action.compareDocumentPosition(contextControl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test("defines the compact controls stacking breakpoint", () => {
    expect(toolHeaderCss).toContain("@media (max-width: 1030px)");
    expect(toolHeaderCss).toContain(".action > *");
    expect(toolHeaderCss).toContain("width: 100%");
  });
});
