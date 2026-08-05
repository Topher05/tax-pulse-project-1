import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { IncomeEntryForm } from "../../pages/income/IncomeEntryForm.tsx";

afterEach(cleanup);

describe("IncomeEntryForm", () => {
  test("shows required errors and blocks an incomplete submission", async () => {
    const onCreate = vi.fn();
    render(<IncomeEntryForm onClose={vi.fn()} onCreate={onCreate} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

    expect(await screen.findByText("Source is required")).toBeInTheDocument();
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
    expect(screen.getByText("Withholding is required")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  test("shows an inline error and blocks a negative amount", async () => {
    const onCreate = vi.fn();
    render(<IncomeEntryForm onClose={vi.fn()} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "Acme Corp" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "-1" } });
    fireEvent.change(screen.getByLabelText("Withholding"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

    expect(await screen.findByText("Amount cannot be negative")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  test("invokes the create handler with a typed payload", async () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();
    render(<IncomeEntryForm onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "Acme Corp" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "1099" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1250.50" } });
    fireEvent.change(screen.getByLabelText("Withholding"), { target: { value: "250.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        source: "Acme Corp",
        type: "1099",
        amount: 1250.5,
        withholding: 250.25,
      });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
