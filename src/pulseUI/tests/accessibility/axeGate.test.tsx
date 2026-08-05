import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { axe } from "vitest-axe";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { ScenarioForm } from "../../components/ScenarioForm.tsx";
import { DashboardPage } from "../../pages/dashboard/DashboardPage.tsx";
import * as detailQueries from "../../entities/taxPlanCycleQueries.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();

  return {
    ...actual,
    Link: ({
      children,
      className,
      to,
    }: {
      children: ReactNode;
      className?: string;
      to: string;
    }) => (
      <a className={className} href={to}>
        {children}
      </a>
    ),
  };
});

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});

async function expectNoCriticalViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, {
    rules: {
      "color-contrast": {
        enabled: true,
      },
    },
  });

  expect(results.violations.filter((violation) => violation.impact === "critical")).toHaveLength(0);
}

describe("Pulse UI accessibility gate", () => {
  test("dashboard reports no critical axe violations", async () => {
    const { container } = render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: "Tax Liability Tracker" })).toBeInTheDocument();

    await expectNoCriticalViolations(container);
  });

  test("plan cycle detail reports no critical axe violations", async () => {
    localStorage.setItem(pulseAccessTokenStorageKey, "test-access-token");

    vi.spyOn(detailQueries, "fetchTaxPlanCycleDetails").mockResolvedValue({
      caseId: "TP-24018",
      client: "North Shore Family Office",
      stage: "Review",
      owner: "Maya Reed",
      priority: "High",
      dueDate: "May 12, 2026",
      scenarioCount: 2,
      onHold: false,
      overdue: true,
    });

    const { container } = render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider>
          <RouterProvider router={createPulseRouter(["/cycles/TP-24018"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "North Shore Family Office - Q2 2026 Tax Plan",
      }),
    ).toBeInTheDocument();

    await expectNoCriticalViolations(container);
  });

  test("scenario planner fields remain labeled and accessible", () => {
    const { container } = render(<ScenarioForm onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Scenario Name" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Additional Income" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Additional Deductions" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Income Type" })).toBeInTheDocument();

    return expectNoCriticalViolations(container);
  });
});
