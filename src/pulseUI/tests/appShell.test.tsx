import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../app/queryClient.ts";
import { createPulseRouter } from "../app/createPulseRouter.ts";
import * as caseApi from "../shared/caseApi.ts";
import { taxPlanCycleRows } from "../../typescript/shared/database/seed.model.ts";

const seededCaseId = taxPlanCycleRows[1].id;

function buildTaxPlanCycleQueuePayload() {
  return taxPlanCycleRows.map((row) => ({
    id: row.id,
    client_id: row.clientId,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority,
    due_date: row.dueDate.toISOString().slice(0, 10),
    on_hold: row.onHold,
    hold_reason: row.holdReason,
    is_overdue: false,
    updated_at: "2026-07-30T00:00:00.000Z",
  }));
}

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderShell = (initialPath: string = "/") => {
  vi.spyOn(caseApi, "caseApiGetJson").mockImplementation(async (path) => {
    if (path === "/v1/tax-plan-cycles") {
      return buildTaxPlanCycleQueuePayload() as never;
    }

    if (path === `/v1/cases/${seededCaseId}/deductions`) {
      return [] as never;
    }

    throw new Error(`Unexpected request: ${path}`);
  });

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <RouterProvider router={createPulseRouter([initialPath])} />
    </QueryClientProvider>,
  );
};

describe("Pulse UI app shell", () => {
  test("renders the workspace sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
  });

  test("renders the plan tools sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Plan Tools" })).toBeInTheDocument();
  });

  test("renders the administration sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Administration" })).toBeInTheDocument();
  });

  test("renders the firm sidebar heading", async () => {
    renderShell("/cycles/queue");

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("heading", { name: "Firm" })).toBeInTheDocument();
  });

  test("renders the queue view title", async () => {
    renderShell("/cycles/queue");

    expect(
      await screen.findByRole("heading", { name: "Tax Plan Cycle Queue", level: 1 }),
    ).toBeInTheDocument();
  });

  test("renders the administration view title", async () => {
    renderShell("/administration/tenants-users");

    expect(
      await screen.findByRole("heading", { name: "All Tenants & Users", level: 1 }),
    ).toBeInTheDocument();
  });

  test("defaults view as to firm admin", async () => {
    renderShell("/cycles/queue");

    expect(await screen.findByRole("combobox", { name: "View as" })).toHaveValue("Firm Admin");
  });

  test("toggles live calculation off", async () => {
    renderShell("/cycles/queue");

    fireEvent.click(await screen.findByRole("button", { name: /Live calculation/i }));

    expect(screen.getByRole("button", { name: /Live calculation/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("opens the settings dialog", async () => {
    renderShell("/cycles/queue");

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });

  test("renders the sidebar footer session card and logout button", async () => {
    renderShell("/cycles/queue");

    const sessionFooter = await screen.findByLabelText("Session");

    expect(within(sessionFooter).getByText("Jordan Lee")).toBeInTheDocument();
    expect(within(sessionFooter).getByText("Firm Admin")).toBeInTheDocument();
    expect(within(sessionFooter).getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  test("renders the dashboard hero on the root route", async () => {
    renderShell("/");

    expect(
      await screen.findByRole("heading", { name: "Tax Liability Tracker" }),
    ).toBeInTheDocument();
  });

  test("still renders placeholder routes that have not been built yet", async () => {
    renderShell("/income");

    expect(await screen.findByRole("heading", { name: "Income" })).toBeInTheDocument();
  });

  test("preserves case ID only across plan tool nav links", async () => {
    renderShell(`/deductions?caseId=${seededCaseId}`);

    const primaryNav = await screen.findByRole("navigation", { name: "Primary" });

    expect(within(primaryNav).getByRole("link", { name: "Scenario Planner" })).toHaveAttribute(
      "href",
      `/scenarios?caseId=${seededCaseId}`,
    );
    expect(within(primaryNav).getByRole("link", { name: "Income" })).toHaveAttribute(
      "href",
      `/income?caseId=${seededCaseId}`,
    );
    expect(within(primaryNav).getByRole("link", { name: "Quarterly Payments" })).toHaveAttribute(
      "href",
      `/quarterly-payments?caseId=${seededCaseId}`,
    );
    expect(within(primaryNav).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(primaryNav).getByRole("link", { name: "Firm Settings" })).toHaveAttribute(
      "href",
      "/firm/settings",
    );
  });
});
