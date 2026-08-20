import "@testing-library/jest-dom/vitest";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import type { SessionRole } from "../../auth/session.ts";
import { AuditLogPage } from "../../pages/administration/AuditLogPage.tsx";
import { RolesPermissionsPage } from "../../pages/administration/RolesPermissionsPage.tsx";
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

function renderAdministrationRoute(
  path: string,
  role: SessionRole = "TaxPulse Platform Admin",
) {
  localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider role={role}>
        <RouterProvider router={createPulseRouter([path])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

function renderPage(page: ReactNode) {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider role="TaxPulse Platform Admin">{page}</TestSessionProvider>
    </QueryClientProvider>,
  );
}

describe("platform administration screens", () => {
  test("renders the roles and permissions matrix from the platform query", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "internal-firm-staff",
        title: "Internal - Firm Staff",
        roles: ["Firm Admin", "Advisor"],
        rows: [
          {
            feature: "Plan Cycle Queue",
            access: {
              "TaxPulse Platform Admin": "Full",
              "Firm Admin": "Full",
              Advisor: "Scoped",
              Client: null,
            },
          },
        ],
      },
    ] as never);

    renderAdministrationRoute("/administration/roles-permissions");

    expect(await screen.findByRole("heading", { name: "Roles & Permissions", level: 1 }))
      .toBeInTheDocument();
    const table = await screen.findByRole("table", {
      name: "Internal - Firm Staff permissions",
    });

    expect(within(table).getByText("Plan Cycle Queue")).toBeInTheDocument();
    expect(within(table).getByText("Scoped")).toBeInTheDocument();
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/administration/roles-permissions",
      expect.any(Function),
    );
  });

  test("renders the audit log with redacted figures", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([
      {
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d41",
        occurredAt: "2026-07-01T14:00:00.000Z",
        user: "advisor-001",
        role: "Advisor",
        action: "income amount [REDACTED_AMOUNT] recorded",
        resource: "North Shore Advisors - 2026-Q3 - Case 018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d11",
      },
    ] as never);

    renderAdministrationRoute("/administration/audit-log");

    const table = await screen.findByRole("table", { name: "Platform audit log" });

    expect(within(table).getByText("advisor-001")).toBeInTheDocument();
    expect(within(table).getByText("income amount [REDACTED_AMOUNT] recorded")).toBeInTheDocument();
    expect(screen.queryByText("125000")).not.toBeInTheDocument();
    expect(caseApi.caseApiGetJson).toHaveBeenCalledWith(
      "/v1/administration/audit-log",
      expect.any(Function),
    );
  });

  test("renders loading and empty states for roles and permissions", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    renderPage(<RolesPermissionsPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading roles and permissions...");

    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);
    renderPage(<RolesPermissionsPage />);

    expect(await screen.findByText("No permissions configured")).toBeInTheDocument();
  });

  test("renders loading and empty states for audit log", async () => {
    vi.spyOn(caseApi, "caseApiGetJson").mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    renderPage(<AuditLogPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading audit log...");

    cleanup();
    vi.restoreAllMocks();
    vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValueOnce([]);
    renderPage(<AuditLogPage />);

    expect(await screen.findByText("No audit entries recorded")).toBeInTheDocument();
  });

  test("blocks firm admins from platform-only roles and audit routes", async () => {
    const getJson = vi.spyOn(caseApi, "caseApiGetJson").mockResolvedValue([]);

    renderAdministrationRoute("/administration/roles-permissions", "Firm Admin");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Roles & Permissions" })).not.toBeInTheDocument();
    });

    cleanup();
    renderAdministrationRoute("/administration/audit-log", "Firm Admin");

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Audit Log" })).not.toBeInTheDocument();
    });
    expect(getJson).not.toHaveBeenCalled();
  });
});
