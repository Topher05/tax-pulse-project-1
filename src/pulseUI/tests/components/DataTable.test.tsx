import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { DataTable } from "../../components/DataTable.tsx";

afterEach(() => {
  cleanup();
});

describe("DataTable", () => {
  test("renders the supplied headers and rows", () => {
    render(
      <DataTable
        ariaLabel="Deduction records"
        columns={[
          { header: "Name", render: (row: { id: string; name: string }) => row.name },
          { header: "Category", render: (row: { id: string; category: string }) => row.category },
        ]}
        rows={[
          { id: "1", name: "Retirement contribution", category: "Retirement" },
          { id: "2", name: "Charitable gifts", category: "Giving" },
        ]}
        rowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole("table", { name: "Deduction records" })).toBeInTheDocument();
    expect(screen.getByText("Retirement contribution")).toBeInTheDocument();
    expect(screen.getByText("Charitable gifts")).toBeInTheDocument();
  });
});
