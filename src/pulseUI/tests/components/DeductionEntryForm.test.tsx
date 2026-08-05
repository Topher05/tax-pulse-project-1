import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DeductionEntryForm", () => {
  test("renders the modal with the default category", () => {
    render(<DeductionEntryForm onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "New Deduction" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("Business Expense");
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeEnabled();
  });

  test("shows inline validation errors, then re-enables submit after fields are corrected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onCreate = vi.fn();
    const onClose = vi.fn();

    render(<DeductionEntryForm onClose={onClose} onCreate={onCreate} />);

    const submitButton = screen.getByRole("button", { name: "Create Deduction" });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Date is required")).toBeInTheDocument();
    });

    expect(screen.getByText("Date is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-07-30" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Home office desk and chair" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1850.55" },
    });

    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        date: "2026-07-30",
        category: "Business Expense",
        description: "Home office desk and chair",
        amount: 1850.55,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test("shows an inline validation error and blocks submit for a negative amount", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onCreate = vi.fn();

    render(<DeductionEntryForm onClose={vi.fn()} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-07-30" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Home office desk and chair" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "-1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Deduction" }));

    expect(await screen.findByText("Amount cannot be negative")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create Deduction" })).toBeDisabled();
  });

  test("calls the create handler with a typed payload and closes the modal", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onCreate = vi.fn();
    const onClose = vi.fn();

    render(<DeductionEntryForm onClose={onClose} onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-07-30" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Home office desk and chair" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1850.55" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Deduction" }));

    await waitFor(() => {
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(onCreate).toHaveBeenCalledWith({
        date: "2026-07-30",
        category: "Business Expense",
        description: "Home office desk and chair",
        amount: 1850.55,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  test("closes from escape and cancel actions", () => {
    const onClose = vi.fn();

    render(<DeductionEntryForm onClose={onClose} onCreate={vi.fn()} />);

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
