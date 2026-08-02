import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

function renderClientRosterPage() {
  localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter(["/clients"])} />
    </QueryClientProvider>,
  );
}

function createDeferredClients() {
  let resolveClients: (items: readonly unknown[]) => void = () => undefined;
  const promise = new Promise<readonly unknown[]>((resolve) => {
    resolveClients = resolve;
  });

  return { promise, resolveClients };
}

describe("ClientRosterPage request states", () => {
  test("renders a loading skeleton while the roster request is in flight", async () => {
    const clientRequest = createDeferredClients();
    vi.spyOn(caseApi, "caseApiGetJson").mockReturnValueOnce(clientRequest.promise);

    renderClientRosterPage();

    expect(await screen.findByRole("status", { name: "Loading Client Roster" })).toBeInTheDocument();
  });

  test("renders the empty state when the firm has no clients", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);

    renderClientRosterPage();

    expect(await screen.findByRole("heading", { name: "No clients yet" })).toBeInTheDocument();
  });

  test("renders an error state with retry when the roster request fails", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockRejectedValueOnce(new Error("Roster service unavailable."));

    renderClientRosterPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("retries the roster request and can recover after failure", async () => {
    const fetchRoster = vi
      .spyOn(caseApi, "caseApiGetJson")
      .mockRejectedValueOnce(new Error("Temporary roster failure."))
      .mockResolvedValueOnce([]);

    renderClientRosterPage();

    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(fetchRoster).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { name: "No clients yet" })).toBeInTheDocument();
  });

  test("renders the success branch when the roster request has data", async () => {
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
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingSummary: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);

    renderClientRosterPage();

    expect(await screen.findByText("Avery Chen")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Client roster" })).toBeInTheDocument();
  });
});
