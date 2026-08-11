import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderPortal(role: "Advisor" | "Client" = "Client") {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider role={role}>
        <RouterProvider router={createPulseRouter(["/my-tax-plan"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

describe("My Tax Plan page", () => {
  test("renders the client-scoped plan stage and summary", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            client_id: "user-synthetic-001",
            stage: "Review",
            owner: "Maya Reed",
            priority: "high",
            due_date: "2026-05-12",
            on_hold: false,
          }),
        ),
      ),
    );

    renderPortal();

    expect(await screen.findByRole("heading", { name: "Your 2026 Tax Plan" })).toBeInTheDocument();
    const stepper = screen.getByLabelText("Case stage progression");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Maya Reed")).toBeInTheDocument();
    expect(screen.getByText("May 12, 2026 at 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("$8,420")).toBeInTheDocument();
    expect(
      screen.getByText("Convert $40k from a traditional IRA to a Roth IRA."),
    ).toBeInTheDocument();
  });

  test("redirects non-Client users away from the portal route", async () => {
    renderPortal("Advisor");

    expect(await screen.findByRole("heading", { name: "Tax Liability Tracker" })).toBeInTheDocument();
    expect(screen.queryByText("Your 2026 Tax Plan")).not.toBeInTheDocument();
  });
});
