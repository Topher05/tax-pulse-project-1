import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import type { PlatformTenantUsersTenant } from "../../entities/platformAdministration.ts";
import { AllTenantsUsersScreen } from "../../pages/administration/AllTenantsUsersPage.tsx";
import * as caseApi from "../../shared/caseApi.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  cleanup();
});

const fixtureTenants = [
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
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d66",
        name: "Avery Chen",
        email: "avery.client@example.com",
        role: "Client",
        status: "Active",
        lastLogin: { kind: "date", value: "Aug 2, 2026" },
      },
    ],
  },
  {
    id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d02",
    name: "Harbor View Planning",
    loginSlug: "harbor-view-planning",
    isActive: true,
    users: [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
        name: "Brianna Cole",
        email: "brianna@example.com",
        role: "Advisor",
        status: "Active",
        lastLogin: { kind: "date", value: "Aug 5, 2026" },
      },
    ],
  },
] as const satisfies readonly PlatformTenantUsersTenant[];

describe("AllTenantsUsersPage", () => {
  test("renders tenants with sectioned user rosters from the platform query", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: fixtureTenants[0].id,
        name: fixtureTenants[0].name,
        loginSlug: fixtureTenants[0].loginSlug,
        isActive: true,
        users: [
          {
            id: fixtureTenants[0].users[0].id,
            name: "Alex Rivera",
            email: "alex@example.com",
            role: "Firm Admin",
            status: "Inactive",
            lastLoginAt: null,
          },
          {
            id: fixtureTenants[0].users[1].id,
            name: "Avery Chen",
            email: "avery.client@example.com",
            role: "Client",
            status: "Active",
            lastLoginAt: "2026-08-02T13:00:00.000Z",
          },
        ],
      },
      {
        id: fixtureTenants[1].id,
        name: fixtureTenants[1].name,
        loginSlug: fixtureTenants[1].loginSlug,
        isActive: true,
        users: [
          {
            id: fixtureTenants[1].users[0].id,
            name: "Brianna Cole",
            email: "brianna@example.com",
            role: "Advisor",
            status: "Active",
            lastLoginAt: "2026-08-05T14:30:00.000Z",
          },
        ],
      },
    ] as never);

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider role="TaxPulse Platform Admin">
          <RouterProvider router={createPulseRouter(["/administration/tenants-users"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "All Tenants & Users", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All Tenants & Users", level: 2 }))
      .toBeInTheDocument();

    const northShoreTable = await screen.findByRole("table", {
      name: "North Shore Advisors users",
    });
    const harborTable = screen.getByRole("table", { name: "Harbor View Planning users" });

    expect(screen.getByRole("button", { name: "Invite User" })).toBeEnabled();
    expect(within(northShoreTable).getByText("Alex Rivera")).toBeInTheDocument();
    expect(within(northShoreTable).getByText("Avery Chen")).toBeInTheDocument();
    expect(within(northShoreTable).getByText("Client")).toBeInTheDocument();
    expect(within(harborTable).getByText("Brianna Cole")).toBeInTheDocument();
    expect(screen.queryByText(/imperson/i)).not.toBeInTheDocument();
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/administration/tenants-users",
      expect.any(Function),
    );
  });

  test("submits an invite under the chosen tenant", () => {
    const onInviteUser = vi.fn();

    render(
      <AllTenantsUsersScreen tenants={fixtureTenants} onInviteUser={onInviteUser} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Invite User" }));
    fireEvent.change(screen.getByLabelText("Tenant"), {
      target: { value: fixtureTenants[1].id },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Jordan Client" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "jordan.client@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "Client" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "Inactive" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create User" }));

    expect(onInviteUser).toHaveBeenCalledWith({
      tenantId: fixtureTenants[1].id,
      displayName: "Jordan Client",
      email: "jordan.client@example.test",
      role: "Client",
      status: "Inactive",
    });
  });

  test("blocks firm admins from the platform administration route", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");
    const getJson = vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValue([]);

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider role="Firm Admin">
          <RouterProvider router={createPulseRouter(["/administration/tenants-users"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "All Tenants & Users" })).not.toBeInTheDocument();
    });
    expect(getJson).not.toHaveBeenCalledWith(
      "/v1/administration/tenants-users",
      expect.any(Function),
    );
  });
});
