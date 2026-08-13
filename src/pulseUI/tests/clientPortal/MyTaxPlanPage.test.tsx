import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import {
  clientTaxPlanQueryKey,
  clientTaxPlanRefreshIntervalMs,
} from "../../entities/clientTaxPlanQueries.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderPortal(role: "Advisor" | "Client" = "Client") {
  const queryClient = createPulseQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <TestSessionProvider role={role}>
        <RouterProvider router={createPulseRouter(["/my-tax-plan"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );

  return queryClient;
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
            advisor: "Maya Reed",
            next_meeting: "2026-09-12T14:00:00.000Z",
            projected_savings: 8420,
            top_recommendation: "Convert $40k from a traditional IRA to a Roth IRA.",
            priority: "high",
            due_date: "2026-05-12",
            on_hold: false,
            scenarios: [
              {
                id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e31",
                name: "Increase retirement contributions",
                total_tax: 72100,
                delta_vs_baseline: -4500,
              },
            ],
          }),
        ),
      ),
    );

    renderPortal();

    expect(await screen.findByRole("heading", { name: "Your 2026 Tax Plan" })).toBeInTheDocument();
    const stepper = screen.getByLabelText("Case stage progression");
    expect(within(stepper).getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Maya Reed")).toBeInTheDocument();
    expect(screen.getByText("September 12, 2026 at 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("$8,420")).toBeInTheDocument();
    expect(
      screen.getByText("Convert $40k from a traditional IRA to a Roth IRA."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Modeled options" })).toBeInTheDocument();
    expect(screen.getByText("Increase retirement contributions")).toBeInTheDocument();
    expect(screen.getByText("$72,100")).toBeInTheDocument();
    expect(screen.getByText("$4,500 below baseline")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advisor messages" })).toBeInTheDocument();
    expect(screen.getByText("No advisor messages yet.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("renders explicit unavailable states from the portal read model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            client_id: "user-synthetic-001",
            stage: "Review",
            owner: "Maya Reed",
            advisor: "Maya Reed",
            next_meeting: null,
            projected_savings: null,
            top_recommendation: null,
            priority: "high",
            due_date: "2026-05-12",
            on_hold: false,
            scenarios: [],
          }),
        ),
      ),
    );

    renderPortal();

    expect(await screen.findByText("Not yet scheduled")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Your recommendation is being prepared.")).toBeInTheDocument();
  });

  test("redirects non-Client users away from the portal route", async () => {
    renderPortal("Advisor");

    expect(await screen.findByRole("heading", { name: "Tax Liability Tracker" })).toBeInTheDocument();
    expect(screen.queryByText("Your 2026 Tax Plan")).not.toBeInTheDocument();
  });

  test("updates the displayed stage when the portal query refreshes", async () => {
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            client_id: "user-synthetic-001",
            stage: "Review",
            owner: "Maya Reed",
            advisor: "Maya Reed",
            next_meeting: null,
            projected_savings: null,
            top_recommendation: null,
            priority: "high",
            due_date: "2026-05-12",
            on_hold: false,
            scenarios: [],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
            client_id: "user-synthetic-001",
            stage: "Client Approval",
            owner: "Maya Reed",
            advisor: "Maya Reed",
            next_meeting: null,
            projected_savings: null,
            top_recommendation: null,
            priority: "high",
            due_date: "2026-05-12",
            on_hold: false,
            scenarios: [],
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchStub);

    const queryClient = renderPortal();

    expect(await screen.findByText("Review", { selector: "p" })).toBeInTheDocument();
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: clientTaxPlanQueryKey });
    });

    expect(
      await screen.findByText("Client Approval", { selector: "p" }),
    ).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(2);
    expect(clientTaxPlanRefreshIntervalMs).toBe(15_000);
  });
});
