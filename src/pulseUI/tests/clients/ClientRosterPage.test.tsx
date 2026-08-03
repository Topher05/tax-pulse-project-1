import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { loaderTimeoutTestingConfig } from "../../shared/loaderTimeoutTestingConfig.ts";
import { mockedClientListings } from "../../shared/mockedClientListings.model.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
  Object.defineProperty(window.location, "reload", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderClientRosterPage(loaderMode?: string) {
  localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

  const querySuffix = loaderMode ? `?${new URLSearchParams({ loaderMode }).toString()}` : "";

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter([`/clients${querySuffix}`])} />
    </QueryClientProvider>,
  );
}

describe("ClientRosterPage loader modes", () => {
  test("renders 25 skeleton rows while loading", async () => {
    renderClientRosterPage("infinite load");

    const skeleton = await screen.findByRole("status", { name: "Loading Client Roster" });

    expect(skeleton.querySelectorAll("div")).toHaveLength(26);
  });

  test("renders the success branch with mocked client listings", async () => {
    renderClientRosterPage("success");

    expect(await screen.findByText(mockedClientListings[0].clientName)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Client roster" })).toBeInTheDocument();
  });

  test("renders the empty page for the empty loader mode", async () => {
    renderClientRosterPage("empty");

    expect(await screen.findByRole("heading", { name: "No data generated" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  test("renders an error state when the request fails immediately", async () => {
    renderClientRosterPage("error");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("renders a delayed success after the timeout window", async () => {
    vi.useFakeTimers();

    renderClientRosterPage("success after 10 seconds");

    expect(await screen.findByRole("status", { name: "Loading Client Roster" })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(loaderTimeoutTestingConfig.timeoutMs);

    expect(await screen.findByText(mockedClientListings[0].clientName)).toBeInTheDocument();
  });

  test("renders a delayed error after the timeout window", async () => {
    vi.useFakeTimers();

    renderClientRosterPage("error after 10 seconds");

    expect(await screen.findByRole("status", { name: "Loading Client Roster" })).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(loaderTimeoutTestingConfig.timeoutMs);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  test("retries the roster request when the retry action is clicked", async () => {
    const reloadSpy = vi.mocked(window.location.reload);

    renderClientRosterPage("error");

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    screen.getByRole("button", { name: "Retry" }).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
