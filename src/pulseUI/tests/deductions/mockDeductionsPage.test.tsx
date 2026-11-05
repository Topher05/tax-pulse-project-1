import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { axe } from "vitest-axe";

import { MockDeductionsPage, buildMockDeductions } from "./mockDeductionsPage.tsx";

afterEach(() => {
  cleanup();
});

describe("MockDeductionsPage", () => {
  test("passes axe on the rendered screen", async () => {
    const { container } = render(<MockDeductionsPage deductions={buildMockDeductions()} />);

    const results = await axe(container, {
      rules: {
        "color-contrast": {
          enabled: false,
        },
      },
    });

    expect(results.violations).toHaveLength(0);
  });

  test("renders table rows when data exists", () => {
    render(<MockDeductionsPage deductions={buildMockDeductions()} />);

    const table = screen.getByRole("table", { name: "Deduction records" });

    expect(table).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("Client dinner with referral partner")).toBeInTheDocument();
    expect(within(table).getByText("Home office monitor and desk chair")).toBeInTheDocument();
  });

  test("renders the empty state when no deductions are provided", () => {
    render(<MockDeductionsPage deductions={[]} />);

    expect(screen.getByRole("table", { name: "Deduction records" })).toBeInTheDocument();
    expect(screen.getByText("No deductions recorded yet.")).toBeInTheDocument();
  });

  test("announces validation errors for the add deduction form", () => {
    render(<MockDeductionsPage deductions={buildMockDeductions()} />);

    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Deduction" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Description is required.");
    expect(screen.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
  });
});
