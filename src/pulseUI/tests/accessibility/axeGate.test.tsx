import "@testing-library/jest-dom/vitest";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { axe } from "vitest-axe";

import { pulseAccessTokenStorageKey } from "../../app/authSession.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { ScenarioForm } from "../../components/ScenarioForm.tsx";
import { DashboardPage } from "../../pages/dashboard/DashboardPage.tsx";
import { NotificationToastProvider } from "../../components/NotificationToast.tsx";
import { AssistantDrawer } from "../../components/assist/AssistantDrawer.tsx";
import * as caseApi from "../../shared/caseApi.ts";
import * as detailQueries from "../../entities/taxPlanCycleQueries.ts";
import { IncomeScreen } from "../../pages/income/IncomePage.tsx";
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
  Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      fillText: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
      measureText: vi.fn(() => ({ width: 0 })),
      putImageData: vi.fn(),
    })),
  });
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

async function expectNoViolations(container: HTMLElement): Promise<void> {
  const results = await axe(container, {
    rules: {
      "color-contrast": {
        enabled: false,
      },
    },
  });

  expect(results.violations).toHaveLength(0);
}

describe("Pulse UI accessibility gate", () => {
  test("assistant drawer states report no axe violations", async () => {
    const assistantCaseContext = {
      caseId: "case-001",
      caseTitle: "North Shore Family Office · Q2 2026 Tax Plan",
      clientName: "Client 001",
      recommendation: "Convert $40k traditional to Roth",
      stage: "Archived",
      advisor: "Advisor 001",
      dueDate: "Jun 30, 2026",
    };
    const baseProps = {
      assistantCaseContext,
      isOpen: true,
      onClose: vi.fn(),
      onSendMessage: vi.fn(async () => undefined),
      onStartNewDialogue: vi.fn(),
    };
    const { container, rerender } = render(
      <NotificationToastProvider>
        <AssistantDrawer
          {...baseProps}
          isLoading={false}
          messages={[
            {
              id: "message-1",
              role: "user",
              title: "Advisor prompt",
              body: "Explain the Roth conversion recommendation.",
            },
          ]}
        />
      </NotificationToastProvider>,
    );

    expect(screen.getByRole("dialog", { name: "North Shore Family Office · Q2 2026 Tax Plan" })).toBeInTheDocument();
    await expectNoViolations(container);

    rerender(
      <NotificationToastProvider>
        <AssistantDrawer {...baseProps} isLoading messages={[]} />
      </NotificationToastProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading assistant" })).toBeInTheDocument();
    await expectNoViolations(container);

    rerender(
      <NotificationToastProvider>
        <AssistantDrawer
          {...baseProps}
          isLoading={false}
          messages={[
            {
              id: "message-2",
              role: "error",
              title: "Assistant unavailable",
              body: "Assistant unavailable.",
            },
          ]}
        />
      </NotificationToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Expand to fullscreen" }));
    expect(screen.getByRole("button", { name: "Collapse to drawer" })).toBeInTheDocument();
    await expectNoViolations(container);
  });

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
      planningPeriod: "Q2 2026",
      cycleLabel: "North Shore Family Office · Q2 2026 Tax Plan",
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
        name: "North Shore Family Office · Q2 2026 Tax Plan",
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

  test("team and users screen reports no axe violations", async () => {
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

    const { container } = render(
      <QueryClientProvider client={createPulseQueryClient()}>
        <TestSessionProvider role="Firm Admin">
          <RouterProvider router={createPulseRouter(["/firm/users"])} />
        </TestSessionProvider>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("table", { name: "Firm team and users roster" }),
    ).toBeInTheDocument();

    await expectNoViolations(container);
  });
  
  test("income screen reports no axe violations", async () => {
    const { container } = render(
      <IncomeScreen
        incomeEvents={[
          {
            id: "income-event-1",
            date: "2026-08-01",
            source: "Example Corporation",
            type: "w2",
            amount: 125_000,
            withholding: 21_500,
          },
        ]}
        queryState="data"
        onCreateIncome={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByRole("table", { name: "Income events" })).toBeInTheDocument();

    const results = await axe(container);

    expect(results.violations).toHaveLength(0);
  });
});
