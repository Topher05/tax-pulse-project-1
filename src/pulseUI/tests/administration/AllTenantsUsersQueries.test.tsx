import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPulseQueryClient } from "../../app/queryClient.ts";
import {
  createPlatformTenantUser,
  fetchPlatformTenantUsers,
  platformTenantUsersQueryKey,
  useCreatePlatformTenantUserMutation,
  usePlatformTenantUsersQuery,
} from "../../entities/platformAdministrationQueries.ts";
import * as caseApi from "../../shared/caseApi.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

function createQueryHarness() {
  const queryClient = createPulseQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TestSessionProvider role="TaxPulse Platform Admin">{children}</TestSessionProvider>
    </QueryClientProvider>
  );

  return { queryClient, wrapper };
}

describe("platform administration queries", () => {
  test("uses an exact tenants users cache key", () => {
    expect(platformTenantUsersQueryKey).toEqual(["platformAdministration", "tenantsUsers"]);
  });

  test("returns parsed tenants with sectioned users for a mocked response", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        name: "North Shore Advisors",
        loginSlug: "north-shore-advisors",
        isActive: true,
        users: [
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
            name: "Alex Rivera",
            email: "alex@example.com",
            role: "Firm Admin",
            status: "Inactive",
            lastLoginAt: null,
          },
        ],
      },
    ] as never);

    await expect(fetchPlatformTenantUsers()).resolves.toEqual([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        name: "North Shore Advisors",
        loginSlug: "north-shore-advisors",
        isActive: true,
        users: [
          {
            id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
            name: "Alex Rivera",
            email: "alex@example.com",
            role: "Firm Admin",
            status: "Inactive",
            lastLogin: { kind: "date", value: "Never" },
          },
        ],
      },
    ]);
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/administration/tenants-users",
      undefined,
    );
  });

  test("creates a platform tenant user through the case API", async () => {
    const caseApiMock = vi.spyOn(caseApi, "caseApiSendJson").mockResolvedValueOnce({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      name: "Jordan Client",
      email: "jordan.client@example.test",
      role: "Client",
      status: "Inactive",
      lastLoginAt: null,
    } as never);

    await expect(
      createPlatformTenantUser({
        tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        displayName: "Jordan Client",
        email: "jordan.client@example.test",
        role: "Client",
        status: "Inactive",
      }),
    ).resolves.toMatchObject({
      name: "Jordan Client",
      email: "jordan.client@example.test",
      role: "Client",
      status: "Inactive",
    });

    expect(caseApiMock).toHaveBeenCalledWith(
      "/v1/administration/tenants/018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01/users",
      {
        method: "POST",
        body: {
          displayName: "Jordan Client",
          email: "jordan.client@example.test",
          role: "Client",
          status: "Inactive",
        },
      },
      undefined,
    );
  });

  test("query and mutation hooks use the platform administration boundary", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);
    vi.spyOn(caseApi, "caseApiSendJson").mockResolvedValueOnce({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9e02",
      name: "Jordan Client",
      email: "jordan.client@example.test",
      role: "Client",
      status: "Inactive",
      lastLoginAt: null,
    } as never);
    const { queryClient, wrapper } = createQueryHarness();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const queryHook = renderHook(() => usePlatformTenantUsersQuery(), { wrapper });

    await waitFor(() => {
      expect(queryHook.result.current.isSuccess).toBe(true);
    });

    const mutationHook = renderHook(() => useCreatePlatformTenantUserMutation(), { wrapper });
    await mutationHook.result.current.mutateAsync({
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
      displayName: "Jordan Client",
      email: "jordan.client@example.test",
      role: "Client",
      status: "Inactive",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: platformTenantUsersQueryKey });
  });
});
