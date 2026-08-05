import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import * as caseApi from "../../shared/caseApi.ts";
import {
  createDeduction,
  useDeductionsQuery,
} from "../../entities/deductionQueries.ts";
import { isUuid } from "../../shared/planToolCase.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

const sampleCaseId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d22";

if (!isUuid(sampleCaseId)) {
  throw new Error("Deductions query test fixture must use a UUID-shaped case ID.");
}

const samplePayload = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01",
  case_id: sampleCaseId,
  date: "2026-07-30",
  description: "Mortgage interest",
  category: "Home Office",
  amount: "18500.00",
  tax_impact: "4625.00",
  deleted: false,
};
const samplePayloads = [samplePayload] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useDeductionsQuery", () => {
  test("parses the deductions payload returned by the case API", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(samplePayloads as never);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeductionsQuery(sampleCaseId), { wrapper });

    expect(result.current.isPending || result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        ...samplePayload,
        amount: 18500,
        tax_impact: 4625,
      },
    ]);
    expect(result.current.data?.[0]?.id).toBe("018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e01");
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      `/v1/cases/${sampleCaseId}/deductions`,
      expect.any(Function),
    );
  });

  test("accepts zero-valued amounts and rejects malformed numeric strings", async () => {
    const zeroPayload = [
      {
        ...samplePayload,
        amount: "0",
        tax_impact: "0.00",
      },
    ];

    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce(zeroPayload as never);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>{children}</TestSessionProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeductionsQuery(sampleCaseId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([
      {
        ...samplePayload,
        amount: 0,
        tax_impact: 0,
      },
    ]);

    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        ...samplePayload,
        amount: "abc",
      },
    ] as never);

    const malformedHook = renderHook(() => useDeductionsQuery(sampleCaseId), { wrapper });

    await waitFor(() => {
      expect(malformedHook.result.current.isError).toBe(true);
    });
  });

  test("creates a deduction through the case API and parses the created row", async () => {
    const createdPayload = {
      ...samplePayload,
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      description: "Client education course",
      category: "Education",
      amount: "1200.50",
      tax_impact: "300.13",
    };
    const caseApiMock = vi
      .spyOn(caseApi, "caseApiSendJson")
      .mockResolvedValueOnce(createdPayload as never);

    await expect(
      createDeduction(sampleCaseId, {
        date: "2026-07-31",
        description: "Client education course",
        category: "Education",
        amount: 1200.5,
      }),
    ).resolves.toEqual({
      ...createdPayload,
      amount: 1200.5,
      tax_impact: 300.13,
    });

    expect(caseApiMock).toHaveBeenCalledWith(`/v1/cases/${sampleCaseId}/deductions`, {
      method: "POST",
      body: {
        date: "2026-07-31",
        description: "Client education course",
        category: "Education",
        amount: 1200.5,
      },
    });
  });
});
