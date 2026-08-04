import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";

import {
  IncomePage,
  type IncomeEvent,
} from "../../pages/income/IncomePage.tsx";

const existingIncome: IncomeEvent = {
  id: "income-1",
  date: "2026-08-01",
  source: "Acme Corporation",
  category: "w2",
  amount: 1_500,
  withholding: 300,
};

afterEach(cleanup);

function IncomePageHarness() {
  const [incomeEvents, setIncomeEvents] = useState<IncomeEvent[]>([existingIncome]);

  return (
    <IncomePage
      clientId="client-1"
      taxYear={2026}
      incomeEvents={incomeEvents}
      onCreateIncome={(payload) => {
        setIncomeEvents((current) => [
          ...current,
          {
            id: "income-2",
            date: "2026-08-04",
            source: payload.source,
            category: payload.type,
            amount: payload.amount,
            withholding: payload.withholding,
          },
        ]);
      }}
    />
  );
}

describe("IncomePage", () => {
  test("renders income data and reflects a successful create", async () => {
    render(<IncomePageHarness />);

    const table = screen.getByRole("table");
    for (const heading of ["Date", "Source", "Type", "Amount", "Withholding"]) {
      expect(within(table).getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    expect(within(table).getByText("Acme Corporation")).toBeInTheDocument();
    expect(within(table).getByText("$1,500.00")).toBeInTheDocument();

    const summaries = screen.getByLabelText("Income source summaries");
    expect(within(summaries).getByText("W-2").parentElement).toHaveTextContent("$1,500.00");
    expect(within(summaries).getByText("Other").parentElement).toHaveTextContent("$0.00");

    fireEvent.click(screen.getByRole("button", { name: "Add Income" }));
    const dialog = screen.getByRole("dialog", { name: "Add Income" });
    fireEvent.change(within(dialog).getByLabelText("Source"), {
      target: { value: "Consulting" },
    });
    fireEvent.change(within(dialog).getByLabelText("Type"), { target: { value: "1099" } });
    fireEvent.change(within(dialog).getByLabelText("Amount"), { target: { value: "250.25" } });
    fireEvent.change(within(dialog).getByLabelText("Withholding"), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Income" }));

    await waitFor(() => {
      expect(within(table).getByText("Consulting")).toBeInTheDocument();
    });
    expect(within(summaries).getByText("1099").parentElement).toHaveTextContent("$250.25");
  });
});
