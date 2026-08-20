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

const firmAdminUser = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
  name: "Alex Rivera",
  email: "alex@example.com",
  role: "Firm Admin",
  status: "Inactive",
  lastLoginAt: null,
} as const;

const advisorUser = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
  name: "Brianna Cole",
  email: "brianna@example.com",
  role: "Advisor",
  status: "Active",
  lastLoginAt: "2026-08-05T14:30:00.000Z",
} as const;

const secondFirmAdminUser = {
  id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
  name: "Casey Morgan",
  email: "casey@example.com",
  role: "Firm Admin",
  status: "Active",
  lastLoginAt: "2026-08-07T12:00:00.000Z",
} as const;

function renderTeamUsersPage() {
  localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider role="Firm Admin">
        <RouterProvider router={createPulseRouter(["/firm/users"])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

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

  test("renders roster rows from supplied firm users", () => {
    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Firm Admin"
        onRoleChange={vi.fn()}
        queryState="data"
      />,
    );

    const roster = screen.getByRole("table", { name: "Firm team and users roster" });
    const rows = within(roster).getAllByRole("row");

    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText("Alex Rivera")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("alex@example.com")).toBeInTheDocument();
    expect(within(rows[1]!).getByRole("combobox", { name: "Role for Alex Rivera" }))
      .toHaveValue("Firm Admin");
    expect(within(rows[1]!).getByText("Inactive")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Never")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Brianna Cole")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("brianna@example.com")).toBeInTheDocument();
    expect(within(rows[2]!).getByRole("combobox", { name: "Role for Brianna Cole" }))
      .toHaveValue("Advisor");
    expect(within(rows[2]!).getByText("Active")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("Aug 5, 2026")).toBeInTheDocument();
  });

  test("renders the empty state when supplied no firm users", () => {
    render(
      <TeamUsersScreen
        users={[]}
        viewerRole="Firm Admin"
        onRoleChange={vi.fn()}
        queryState="empty"
      />,
    );

    expect(screen.getByRole("heading", { name: "No team users yet" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Only the tenant admin is active. Invite advisors or client portal users to build out this workspace.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("0 users")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Firm team and users roster" }))
      .not.toBeInTheDocument();
  });

  test("invokes the role update handler with the selected user and role for Firm Admins", () => {
    const onRoleChange = vi.fn();

    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Firm Admin"
        onRoleChange={onRoleChange}
        queryState="data"
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Role for Brianna Cole" }), {
      target: { value: "Firm Admin" },
    });

    expect(onRoleChange).toHaveBeenCalledWith(fixtureUsers[1], "Firm Admin");
  });

  test("disables role assignment controls for non-admin viewers", () => {
    render(
      <TeamUsersScreen
        users={fixtureUsers}
        viewerRole="Advisor"
        onRoleChange={vi.fn()}
        queryState="data"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Role for Alex Rivera" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Role for Brianna Cole" })).toBeDisabled();
  });

  test("renders the team roster scaffold with live firm users", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      firmAdminUser,
      advisorUser,
    ] as never);

    renderTeamUsersPage();

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

  test("renders a loading skeleton while firm users are in flight", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementationOnce(
      () => new Promise(() => undefined) as never,
    );

    renderTeamUsersPage();

    const skeleton = await screen.findByRole("status", { name: "Loading Team & Users" });

    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Firm team and users roster" }))
      .not.toBeInTheDocument();
  });

  test("renders the firm admin roster when only admins exist", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      firmAdminUser,
      secondFirmAdminUser,
    ] as never);

    renderTeamUsersPage();

    expect(await screen.findByRole("table", { name: "Firm team and users roster" }))
      .toBeInTheDocument();
    expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
    expect(screen.getByText("Casey Morgan")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No team users yet" })).not.toBeInTheDocument();
  });

  test("renders the empty state when the tenant has no users", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([] as never);

    renderTeamUsersPage();

    expect(await screen.findByRole("heading", { name: "No team users yet" }))
      .toBeInTheDocument();
    expect(screen.getByText("0 users")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Firm team and users roster" }))
      .not.toBeInTheDocument();
  });

  test("renders an error state with retry and recovers after retry", async () => {
    vi.spyOn(caseApi, "caseApiGetJson")
      .mockRejectedValueOnce(new Error("Firm users request failed."))
      .mockResolvedValueOnce([firmAdminUser, advisorUser] as never);

    renderTeamUsersPage();

    expect(await screen.findByRole("heading", { name: "Team users could not load" }))
      .toBeInTheDocument();
    expect(screen.getByText("Firm users request failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("table", { name: "Firm team and users roster" }))
      .toBeInTheDocument();
    expect(screen.getByText("Brianna Cole")).toBeInTheDocument();
  });
});
