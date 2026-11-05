import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import * as caseApi from "../../shared/caseApi.ts";
import { isUuid, type Uuid } from "../../shared/planToolCase.ts";
import {
  clientRosterRows,
  taxPlanCycleRows,
} from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const seededCaseId = taxPlanCycleRows[1].id;
const seededClientName = clientRosterRows[2].clientName;
const staleClientName = "Stale roster name";

if (!isUuid(seededCaseId)) {
  throw new Error("CurrentCaseSelector test fixture must use a UUID-shaped case ID.");
}

function buildTaxPlanCycleQueuePayload() {
  return taxPlanCycleRows.map((row) => ({
    id: row.id,
    client_id: row.clientId,
    client_name: row.id === seededCaseId ? seededClientName : "Queue client",
    planning_period: row.planningPeriod,
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

function buildClientRosterPayload() {
  return clientRosterRows.map((row) => ({
    id: row.id,
    clientName: row.clientName,
    filingStatus: row.filingStatus,
    ytdIncome: Number(row.ytdIncome),
    estimatedTax: Number(row.estimatedTax),
    quarterlyStatus: row.quarterlyStatus,
  }));
}

function renderSelector({
  caseId = null,
  onCaseIdChange = vi.fn(),
}: {
  caseId?: Uuid | null;
  onCaseIdChange?: (caseId: Uuid) => void;
} = {}) {
  vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path) => {
    if (path === "/v1/clients") {
      return Promise.resolve(buildClientRosterPayload()) as never;
    }

    return Promise.resolve(buildTaxPlanCycleQueuePayload()) as never;
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>{children}</TestSessionProvider>
    </QueryClientProvider>
  );

  render(
    <CurrentCaseSelector caseId={caseId} onCaseIdChange={onCaseIdChange} />,
    { wrapper },
  );

  return { onCaseIdChange };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CurrentCaseSelector", () => {
  test("renders the accessible tax plan selector and default option", async () => {
    renderSelector();

    const selector = await screen.findByRole("combobox", { name: "Tax plan" });

    expect(screen.getByText("Tax plan")).toBeInTheDocument();
    expect(selector).toHaveValue("");
    expect(await screen.findByRole("option", { name: "Select a tax plan" })).toBeInTheDocument();
    expect(selector).toHaveClass("opacity-80");
    expect(selector).toHaveStyle({ padding: "18px 2px 10px 5px" });
    expect(selector.closest("label")).toHaveClass("min-[1031px]:w-[22rem]");
  });

  test("populates friendly options from the tax plan cycle queue endpoint", async () => {
    renderSelector();

    await waitFor(() => {
      expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
        "/v1/tax-plan-cycles",
        expect.any(Function),
      );
    });

    expect(
      await screen.findByRole("option", { name: `${seededClientName} · Q4 2026 Tax Plan` }),
    ).toBeInTheDocument();
  });

  test("prefers a queue client name over a stale roster name", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path) => {
      if (path === "/v1/clients") {
        return Promise.resolve([
          {
            ...buildClientRosterPayload()[2],
            clientName: staleClientName,
          },
        ]) as never;
      }

      return Promise.resolve([
        {
          ...buildTaxPlanCycleQueuePayload()[1],
          client_name: seededClientName,
        },
      ]) as never;
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );

    render(
      <CurrentCaseSelector caseId={null} onCaseIdChange={vi.fn()} />,
      { wrapper },
    );

    expect(
      await screen.findByRole("option", { name: `${seededClientName} · Q4 2026 Tax Plan` }),
    ).toBeInTheDocument();
  });

  test("uses an unavailable label without exposing a client ID", async () => {
    const clientId = clientRosterRows[2].id;
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path) => {
      if (path === "/v1/clients") {
        return Promise.resolve(buildClientRosterPayload()) as never;
      }

      return Promise.resolve([
        {
          ...buildTaxPlanCycleQueuePayload()[1],
          client_id: clientId,
          client_name: "",
        },
      ]) as never;
    });

    const onCaseIdChange = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );

    render(
      <CurrentCaseSelector caseId={null} onCaseIdChange={onCaseIdChange} />,
      { wrapper },
    );

    const option = await screen.findByRole("option", {
      name: "Client unavailable · Q4 2026 Tax Plan",
    });
    expect(option).toHaveValue(seededCaseId);
  });

  test("disambiguates duplicate client names while preserving the full UUID value", async () => {
    const firstCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11";
    const secondCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22";
    const onCaseIdChange = vi.fn();

    vi.spyOn(caseApi, "caseApiGetJson").mockImplementation((path) => {
      if (path === "/v1/clients") {
        return Promise.resolve([]) as never;
      }

      return Promise.resolve([
        {
          ...buildTaxPlanCycleQueuePayload()[1],
          id: firstCaseId,
          client_name: "Jordan Lee",
          cycle_label: "Jordan Lee · Q4 2026 Tax Plan · Plan 1",
        },
        {
          ...buildTaxPlanCycleQueuePayload()[1],
          id: secondCaseId,
          client_name: "Jordan Lee",
          cycle_label: "Jordan Lee · Q4 2026 Tax Plan · Plan 2",
        },
      ]) as never;
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );

    render(<CurrentCaseSelector caseId={null} onCaseIdChange={onCaseIdChange} />, { wrapper });

    const selector = await screen.findByRole("combobox", { name: "Tax plan" });
    expect(await screen.findByRole("option", { name: "Jordan Lee · Q4 2026 Tax Plan · Plan 1" })).toHaveValue(
      firstCaseId,
    );
    expect(screen.getByRole("option", { name: "Jordan Lee · Q4 2026 Tax Plan · Plan 2" })).toHaveValue(secondCaseId);

    fireEvent.change(selector, { target: { value: secondCaseId } });

    expect(onCaseIdChange).toHaveBeenCalledWith(secondCaseId);
  });

  test("emits selected case IDs only when they are UUID-shaped", async () => {
    const onCaseIdChange = vi.fn();
    renderSelector({ onCaseIdChange });

    const selector = await screen.findByRole("combobox", { name: "Tax plan" });
    await screen.findByRole("option", { name: `${seededClientName} · Q4 2026 Tax Plan` });

    fireEvent.change(selector, { target: { value: "" } });
    fireEvent.change(selector, { target: { value: "not-a-uuid" } });
    fireEvent.change(selector, { target: { value: seededCaseId } });

    expect(onCaseIdChange).toHaveBeenCalledTimes(1);
    expect(onCaseIdChange).toHaveBeenCalledWith(seededCaseId);
  });

  test("uses full opacity when a real case is selected", async () => {
    renderSelector({ caseId: seededCaseId });

    expect(await screen.findByRole("combobox", { name: "Tax plan" })).toHaveClass("opacity-100");
  });
});
