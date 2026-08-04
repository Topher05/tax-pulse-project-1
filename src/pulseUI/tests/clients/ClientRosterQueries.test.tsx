import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import {
  clientRosterQueryKey,
  useClientRosterQuery,
} from "../../entities/clientRosterQueries.ts";
import * as caseApi from "../../shared/caseApi.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

function createQueryWrapper() {
  const queryClient = createPulseQueryClient();

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Client roster query hook", () => {
  test("uses an exact client roster cache key", () => {
    expect(clientRosterQueryKey).toEqual(["clientRoster"]);
  });

  test("returns parsed client rows for the tenant-scoped roster response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingStatus: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);

    const { result } = renderHook(() => useClientRosterQuery(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith("/v1/clients");
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual([
      {
        id: "client-avery-chen",
        clientName: "Avery Chen",
        filingStatus: "Single - 1099",
        ytdIncome: 108_500,
        estimatedTax: 32_100,
        quarterlyStatus: "Q2 due Jun 15",
      },
      {
        id: "client-riley-khan",
        clientName: "Riley Khan",
        filingStatus: "HoH - W-2",
        ytdIncome: 72_500,
        estimatedTax: 11_140,
        quarterlyStatus: null,
      },
    ]);
  });
});
