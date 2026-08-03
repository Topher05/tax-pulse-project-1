import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import * as caseApi from "../../shared/caseApi.ts";
import * as pageReload from "../../shared/pageReload.ts";

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

describe("ClientRosterPage", () => {
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

  test("renders the success branch with client roster data", async () => {
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

  test("renders the empty page when the firm has no clients", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);
    const reloadSpy = vi.spyOn(pageReload, "reloadPage").mockImplementation(() => undefined);

    renderClientRosterPage();

    expect(await screen.findByRole("heading", { name: "No data generated" })).toBeInTheDocument();
    screen.getByRole("button", { name: "Refresh" }).click();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  test("renders an error state with a refresh retry affordance", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockRejectedValueOnce(new Error("Roster service unavailable."));

    renderClientRosterPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("retry triggers a page refresh", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockRejectedValueOnce(new Error("Temporary roster failure."));
    const reloadSpy = vi.spyOn(pageReload, "reloadPage").mockImplementation(() => undefined);

    renderClientRosterPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    screen.getByRole("button", { name: "Retry" }).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
