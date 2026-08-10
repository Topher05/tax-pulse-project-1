import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import type { FirmUserRow } from "../../entities/firmUsers.ts";
import { TeamUsersScreen } from "../../pages/firm/TeamUsersPage.tsx";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";
import * as caseApi from "../../shared/caseApi.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  cleanup();
});

describe("TeamUsersPage", () => {
  const fixtureUsers = [
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
  ] as const satisfies readonly FirmUserRow[];

  test("renders the team roster scaffold with live firm users", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");
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

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider role="Firm Admin">
          <RouterProvider router={createPulseRouter(["/firm/users"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Team & Users", level: 1 }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team & Users", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage your firm's staff and client portal accounts & invite users and assign their role within your tenant.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Invite User" })).toBeDisabled();

    const metricCards = screen.getAllByRole("article");
    expect(metricCards).toHaveLength(4);
    expect(screen.getByText("Total users")).toBeInTheDocument();
    expect(screen.getByText("Active users")).toBeInTheDocument();
    expect(screen.getByText("Pending invites")).toBeInTheDocument();
    expect(screen.getByText("Roles in use")).toBeInTheDocument();
    expect(await within(metricCards[0]!).findByText("2 users")).toBeInTheDocument();
    expect(within(metricCards[1]!).getByText("1 active user")).toBeInTheDocument();
    expect(within(metricCards[2]!).getByText("1 pending invite")).toBeInTheDocument();
    expect(within(metricCards[3]!).getByText("2")).toBeInTheDocument();

    const roster = screen.getByRole("table", { name: "Firm team and users roster" });
    expect(roster).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Last Login" })).toBeInTheDocument();

    expect(screen.getByRole("combobox", { name: "Role for Alex Rivera" })).toHaveValue(
      "Firm Admin",
    );
    expect(screen.getByRole("combobox", { name: "Role for Brianna Cole" })).toHaveValue(
      "Advisor",
    );
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Brianna Cole")).toBeInTheDocument();
    expect(screen.getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("Aug 5, 2026")).toBeInTheDocument();
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/firm/users",
      expect.any(Function),
    );
  });

  test("invokes the role update handler with the selected user and role for Firm Admins", () => {
    const onRoleChange = vi.fn();

    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Firm Admin"
        onRoleChange={onRoleChange}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Role for Brianna Cole" }), {
      target: { value: "Firm Admin" },
    });

    expect(onRoleChange).toHaveBeenCalledWith(fixtureUsers[1], "Firm Admin");
  });

  test("omits platform administrator from tenant role assignment options", () => {
    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Firm Admin"
        onRoleChange={vi.fn()}
      />,
    );

    const briannaRoleControl = screen.getByRole("combobox", { name: "Role for Brianna Cole" });
    const roleOptions = within(briannaRoleControl).getAllByRole("option");

    expect(roleOptions.map((option) => option.textContent)).toEqual([
      "Firm Admin",
      "Advisor",
      "Client",
    ]);
    expect(
      within(briannaRoleControl).queryByRole("option", { name: "TaxPulse Platform Admin" }),
    ).not.toBeInTheDocument();
  });

  test("prevents Firm Admins from editing platform administrator rows", () => {
    const onRoleChange = vi.fn();
    const platformUsers = [
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d69",
        name: "Platform Operator",
        email: "platform@example.com",
        role: "TaxPulse Platform Admin",
        status: "Active",
        lastLogin: { kind: "date", value: "Aug 6, 2026" },
      },
    ] as const satisfies readonly FirmUserRow[];

    render(
      <TeamUsersScreen
        users={platformUsers}
        viewerRole="Firm Admin"
        onRoleChange={onRoleChange}
      />,
    );

    const roleControl = screen.getByRole("combobox", { name: "Role for Platform Operator" });

    expect(roleControl).toBeDisabled();
    expect(roleControl).toHaveValue("TaxPulse Platform Admin");
    expect(onRoleChange).not.toHaveBeenCalled();
  });

  test("disables role assignment controls for non-admin viewers", () => {
    const onRoleChange = vi.fn();

    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Advisor"
        onRoleChange={onRoleChange}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Role for Alex Rivera" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Role for Brianna Cole" })).toBeDisabled();
  });
});
