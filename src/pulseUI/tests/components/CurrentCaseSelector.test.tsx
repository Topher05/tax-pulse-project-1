import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import * as caseApi from "../../shared/caseApi.ts";
import { isUuid, type Uuid } from "../../shared/planToolCase.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";

const seededCaseId = taxPlanCycleRows[1].id;

if (!isUuid(seededCaseId)) {
  throw new Error("CurrentCaseSelector test fixture must use a UUID-shaped case ID.");
}

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

function renderSelector({
  caseId = null,
  onCaseIdChange = vi.fn(),
}: {
  caseId?: Uuid | null;
  onCaseIdChange?: (caseId: Uuid) => void;
} = {}) {
  vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValue(buildTaxPlanCycleQueuePayload() as never);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createPulseQueryClient()}>{children}</QueryClientProvider>
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
  test("renders the accessible case ID selector and default option", async () => {
    renderSelector();

    const selector = await screen.findByRole("combobox", { name: "Case ID" });

    expect(screen.getByText("Case ID")).toBeInTheDocument();
    expect(selector).toHaveValue("");
    expect(await screen.findByRole("option", { name: "Select a Case ID" })).toBeInTheDocument();
    expect(selector).toHaveClass("opacity-80");
    expect(selector).toHaveStyle({ padding: "18px 2px 10px 5px" });
    expect(selector.closest("label")).toHaveClass("min-[1031px]:w-[22rem]");
  });

  test("populates options from the tax plan cycle queue endpoint", async () => {
    renderSelector();

    await waitFor(() => {
      expect(caseApi.caseApiGetJson).toHaveBeenCalledWith("/v1/tax-plan-cycles", undefined);
    });

    expect(await screen.findByRole("option", { name: seededCaseId })).toBeInTheDocument();
  });

  test("emits selected case IDs only when they are UUID-shaped", async () => {
    const onCaseIdChange = vi.fn();
    renderSelector({ onCaseIdChange });

    const selector = await screen.findByRole("combobox", { name: "Case ID" });
    await screen.findByRole("option", { name: seededCaseId });

    fireEvent.change(selector, { target: { value: "" } });
    fireEvent.change(selector, { target: { value: "not-a-uuid" } });
    fireEvent.change(selector, { target: { value: seededCaseId } });

    expect(onCaseIdChange).toHaveBeenCalledTimes(1);
    expect(onCaseIdChange).toHaveBeenCalledWith(seededCaseId);
  });

  test("uses full opacity when a real case is selected", async () => {
    renderSelector({ caseId: seededCaseId });

    expect(await screen.findByRole("combobox", { name: "Case ID" })).toHaveClass("opacity-100");
  });
});
