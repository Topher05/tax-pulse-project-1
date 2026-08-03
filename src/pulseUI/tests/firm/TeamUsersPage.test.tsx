import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
});

describe("TeamUsersPage", () => {
  test("renders the team roster scaffold with KPI cards and 12 mock users", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

    render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <RouterProvider router={createPulseRouter(["/firm/users"])} />
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
    expect(within(metricCards[0]!).getByText("12 users")).toBeInTheDocument();
    expect(within(metricCards[1]!).getByText("7 active users")).toBeInTheDocument();
    expect(within(metricCards[2]!).getByText("5 pending invites")).toBeInTheDocument();
    expect(within(metricCards[3]!).getByText("4")).toBeInTheDocument();

    const roster = screen.getByRole("table", { name: "Firm team and users roster" });
    expect(roster).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Last Login" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Action" })).toBeInTheDocument();

    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(12);
    expect(screen.getByText("5 min ago")).toBeInTheDocument();
    expect(screen.getAllByText("Today")).toHaveLength(2);
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });
});
