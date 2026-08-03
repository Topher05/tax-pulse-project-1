import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";
import * as caseApi from "../../shared/caseApi.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

describe("ClientRosterPage", () => {
  test("renders the client roster from the query hook", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingSummary: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-sam-rivera",
        clientName: "Sam Rivera",
        filingSummary: "Single - 1099",
        ytdIncome: 142_000,
        estimatedTax: 38_240,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-morgan-acme",
        clientName: "Morgan Acme",
        filingSummary: "MFJ - W-2 + RSU",
        ytdIncome: 414_000,
        estimatedTax: 138_400,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingSummary: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);
    render(
      <TestSessionProvider>
        <QueryClientProvider client={createPulseQueryClient()}>
          <RouterProvider router={createPulseRouter(["/clients"])} />
        </QueryClientProvider>
      </TestSessionProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Client Roster", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Client Roster" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Roster", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText("Switch into a client's books with read-only access; build scenarios for them."),
    ).toBeInTheDocument();

    expect(screen.getByRole("table", { name: "Client roster" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Client" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Filing" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "YTD Income" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Est. Tax" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Quarterly" })).toBeInTheDocument();

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(screen.getAllByText("Single - 1099")).toHaveLength(2);
    expect(screen.getByText("$108,500")).toBeInTheDocument();
    expect(screen.getByText("$32,100")).toBeInTheDocument();
    expect(screen.getAllByText("Q2 due Jun 15")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Open Books" })).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: "Open Books" })[0]).toBeDisabled();
  });
});
