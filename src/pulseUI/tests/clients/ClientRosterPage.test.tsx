import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { axe } from "vitest-axe";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import * as pageReload from "../../shared/pageReload.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderClientRosterPage() {
  return render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter(["/clients"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

function clientNamesInTable(): string[] {
  const table = screen.getByRole("table", { name: "Client roster" });
  const rows = within(table).getAllByRole("row").slice(1);
  const clientNamePattern =
    /Avery Chen|Sam Rivera|Morgan Acme|Riley Khan|Jordan Null|Casey Zero|Taylor Match/u;

  return rows.map((row) => {
    const match = row.textContent?.match(clientNamePattern);

    if (!match) {
      throw new Error(`Could not find a client name in row: ${row.textContent ?? ""}`);
    }

    return match[0];
  });
}

describe("ClientRosterPage", () => {
  test("passes axe on the rendered client roster screen", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingStatus: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);

    const { container } = renderClientRosterPage();

    expect(await screen.findByRole("table", { name: "Client roster" })).toBeInTheDocument();

    const results = await axe(container);

    expect(results.violations).toHaveLength(0);
  });

  test("renders a loading skeleton while the roster request is in flight", async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    const request = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    vi.spyOn(caseApi, "caseApiGetJson").mockReturnValueOnce(request);

    renderClientRosterPage();

    const skeleton = await screen.findByRole("status", { name: "Loading Client Roster" });

    expect(skeleton.querySelectorAll("div")).toHaveLength(26);

    resolveRequest([]);
  });

  test("renders TanStack Table columns and hook-backed client roster rows", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-sam-rivera",
        clientName: "Sam Rivera",
        filingStatus: "Single - 1099",
        ytdIncome: 142_000,
        estimatedTax: 38_240,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-morgan-acme",
        clientName: "Morgan Acme",
        filingStatus: "MFJ - W-2 + RSU",
        ytdIncome: 414_000,
        estimatedTax: 138_400,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingStatus: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);

    renderClientRosterPage();

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Client roster" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle Client sorting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle Filing sorting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle YTD Income sorting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle Est. Tax sorting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle Quarterly sorting" })).toBeInTheDocument();
    expect(clientNamesInTable()).toEqual([
      "Avery Chen",
      "Sam Rivera",
      "Morgan Acme",
      "Riley Khan",
    ]);
    expect(screen.getByText("$108,500")).toBeInTheDocument();
    expect(screen.getByText("$138,400")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  test("sorts client rows through the TanStack column model", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-sam-rivera",
        clientName: "Sam Rivera",
        filingStatus: "Single - 1099",
        ytdIncome: 142_000,
        estimatedTax: 38_240,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-morgan-acme",
        clientName: "Morgan Acme",
        filingStatus: "MFJ - W-2 + RSU",
        ytdIncome: 414_000,
        estimatedTax: 138_400,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingStatus: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);

    renderClientRosterPage();

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle YTD Income sorting" }));

    const firstSortedClient = clientNamesInTable()[0];
    expect(firstSortedClient).toMatch(/Morgan Acme|Riley Khan/u);

    fireEvent.click(screen.getByRole("button", { name: "Toggle YTD Income sorting" }));

    expect(clientNamesInTable()[0]).not.toBe(firstSortedClient);
    expect(clientNamesInTable()[0]).toMatch(/Morgan Acme|Riley Khan/u);
  });

  test("sorts nullable quarterly statuses without dropping null rows", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-jordan-null",
        clientName: "Jordan Null",
        filingStatus: "Single - W-2",
        ytdIncome: 98_000,
        estimatedTax: 18_200,
        quarterlyStatus: null,
      },
      {
        id: "client-casey-zero",
        clientName: "Casey Zero",
        filingStatus: "MFJ - 1099",
        ytdIncome: 0,
        estimatedTax: 0,
        quarterlyStatus: "Current",
      },
      {
        id: "client-taylor-match",
        clientName: "Taylor Match",
        filingStatus: "HoH - W-2",
        ytdIncome: 121_000,
        estimatedTax: 0,
        quarterlyStatus: "Q4 due Jan 15",
      },
    ]);

    renderClientRosterPage();

    expect(await screen.findByText("Jordan Null")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toggle Quarterly sorting" }));

    expect(clientNamesInTable()).toHaveLength(3);
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getAllByText("$0")).toHaveLength(3);
  });

  test("does not expose sorting on the inactive Open Books action column", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
    ]);

    renderClientRosterPage();

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open Books sorting/u })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Books" })).toBeDisabled();
  });

  test("renders the empty page when the firm has no clients", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);
    const reloadSpy = vi.spyOn(pageReload, "reloadPage").mockImplementation(() => undefined);

    renderClientRosterPage();

    expect(await screen.findByRole("heading", { name: "No data generated" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Refresh" }).click();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  test("renders an error state with a refresh retry affordance", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockRejectedValueOnce(
      new Error("Roster service unavailable."),
    );

    renderClientRosterPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("retry triggers a page refresh", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockRejectedValueOnce(
      new Error("Temporary roster failure."),
    );
    const reloadSpy = vi.spyOn(pageReload, "reloadPage").mockImplementation(() => undefined);

    renderClientRosterPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    screen.getByRole("button", { name: "Retry" }).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
