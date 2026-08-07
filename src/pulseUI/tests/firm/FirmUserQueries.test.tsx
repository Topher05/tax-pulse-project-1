import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import {
  firmUsersQueryKey,
  updateFirmUserRole,
  useFirmUsersQuery,
  useUpdateFirmUserRoleMutation,
} from "../../entities/firmUserQueries.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

function createQueryWrapper() {
  const queryClient = createPulseQueryClient();

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TestSessionProvider role="Firm Admin">{children}</TestSessionProvider>
      </QueryClientProvider>
    );
  };
}

function createQueryHarness() {
  const queryClient = createPulseQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TestSessionProvider role="Firm Admin">{children}</TestSessionProvider>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe("firm user queries", () => {
  test("uses an exact firm users cache key", () => {
    expect(firmUsersQueryKey).toEqual(["firmUsers"]);
  });

  test("returns parsed firm user rows for a mocked response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        name: "Alex Rivera",
        email: "alex@example.com",
        role: "Firm Admin",
        status: "Inactive",
        lastLoginAt: null,
      },
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        name: "Brianna Cole",
        email: "brianna@example.com",
        role: "Advisor",
        status: "Active",
        lastLoginAt: "2026-08-05T14:30:00.000Z",
      },
    ] as never);

    const { result } = renderHook(() => useFirmUsersQuery(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isPending || result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/firm/users",
      expect.any(Function),
    );
    expect(result.current.isError).toBe(false);
    expect(result.current.data).toEqual([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        name: "Alex Rivera",
        email: "alex@example.com",
        role: "Firm Admin",
        status: "Inactive",
        lastLogin: { kind: "date", value: "Never" },
      },
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        name: "Brianna Cole",
        email: "brianna@example.com",
        role: "Advisor",
        status: "Active",
        lastLogin: { kind: "date", value: "Aug 5, 2026" },
      },
    ]);
  });

  test("updates a tenant-scoped firm user role through the case API", async () => {
    const caseApiMock = vi.spyOn(caseApi, "caseApiSendJson").mockResolvedValueOnce({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
      name: "Brianna Cole",
      email: "brianna@example.com",
      role: "Firm Admin",
      status: "Active",
      lastLoginAt: "2026-08-05T14:30:00.000Z",
    } as never);

    await expect(
      updateFirmUserRole({
        userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        role: "Firm Admin",
      }),
    ).resolves.toEqual({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
      name: "Brianna Cole",
      email: "brianna@example.com",
      role: "Firm Admin",
      status: "Active",
      lastLogin: { kind: "date", value: "Aug 5, 2026" },
    });

    expect(caseApiMock).toHaveBeenCalledWith(
      "/v1/firm/users/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62/role",
      {
        method: "PATCH",
        body: {
          role: "Firm Admin",
        },
      },
      undefined,
    );
  });

  test("invalidates the firm users query after a role update succeeds", async () => {
    vi.spyOn(caseApi, "caseApiSendJson").mockResolvedValueOnce({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
      name: "Brianna Cole",
      email: "brianna@example.com",
      role: "Firm Admin",
      status: "Active",
      lastLoginAt: "2026-08-05T14:30:00.000Z",
    } as never);
    const { queryClient, wrapper } = createQueryHarness();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateFirmUserRoleMutation(), { wrapper });

    await result.current.mutateAsync({
      userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
      role: "Firm Admin",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: firmUsersQueryKey });
  });
});
