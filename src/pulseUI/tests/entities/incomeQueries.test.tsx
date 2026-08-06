import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import {
  fetchIncomeEvents,
  incomeEventsQueryKey,
  useIncomeEventsQuery,
} from "../../entities/incomeQueries.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { isUuid } from "../../shared/planToolCase.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const sampleCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22";

if (!isUuid(sampleCaseId)) {
  throw new Error("Income query test fixture must use a UUID-shaped case ID.");
}

const samplePayload = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8ca106",
  case_id: sampleCaseId,
  date: "2026-08-01",
  source: "Acme W-2",
  type: "w2",
  amount: "125000.50",
  withholding: "21500.25",
};

afterEach(() => {
  vi.restoreAllMocks();
});

function createQueryWrapper() {
  const queryClient = createPulseQueryClient();

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe("income event queries", () => {
  test("uses a case-scoped income events cache key", () => {
    expect(incomeEventsQueryKey(sampleCaseId)).toEqual(["income-events", sampleCaseId]);
  });

  test("returns parsed income events for a mocked response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([samplePayload] as never);

    const { result } = renderHook(() => useIncomeEventsQuery(sampleCaseId), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isPending || result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      `/v1/cases/${sampleCaseId}/income-events`,
      expect.any(Function),
    );
    expect(result.current.data).toEqual([
      {
        ...samplePayload,
        amount: 125000.5,
        withholding: 21500.25,
      },
    ]);
  });

  test("rejects malformed income currency values at the typed boundary", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        ...samplePayload,
        amount: "not-a-number",
      },
    ] as never);

    await expect(fetchIncomeEvents(sampleCaseId)).rejects.toThrow();
  });
});
