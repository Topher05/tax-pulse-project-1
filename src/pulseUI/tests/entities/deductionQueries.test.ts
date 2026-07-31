import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { useDeductionsQuery } from "../../entities/deductionQueries.ts";

const samplePayload = {
  caseId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22",
  incomeEvents: [
    {
      source: "W-2 wages",
      amount: 125000,
      withholding: 24500,
    },
  ],
  deductions: [
    {
      id: "ded-001",
      date: "2026-07-30",
      description: "Mortgage interest",
      category: "Home Office",
      amount: 18500,
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeductionsQuery", () => {
  test("parses the deductions payload returned by the case API", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(samplePayload as never);
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(
        QueryClientProvider,
        { client: createPulseQueryClient() },
        children,
      )
    );

    const { result } = renderHook(() => useDeductionsQuery("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22"), { wrapper });

    expect(result.current.isPending || result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(samplePayload);
    expect(result.current.data?.deductions[0]?.id).toBe("ded-001");
  });
});
