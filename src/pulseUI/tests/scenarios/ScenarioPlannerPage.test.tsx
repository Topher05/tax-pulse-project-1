import "@testing-library/jest-dom/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { createPulseRouter } from "../../app/createPulseRouter.ts";
import { createPulseQueryClient } from "../../app/queryClient.ts";
import { taxPlanCycleRows } from "../../../typescript/shared/database/seed.model.ts";
import { TestSessionProvider } from "../auth/TestSessionProvider.tsx";
import * as caseApi from "../../shared/caseApi.ts";

const seededCaseId = taxPlanCycleRows[1].id;

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  cleanup();
  vi.restoreAllMocks();
});


function renderScenarioPlannerRoute(pathname: string) {
  render(
    <QueryClientProvider client={createPulseQueryClient()}>
      <TestSessionProvider>
        <RouterProvider router={createPulseRouter([pathname])} />
      </TestSessionProvider>
    </QueryClientProvider>,
  );
}

function mockScenarioResults() {
  return vi.spyOn(caseApi, "caseApiPostJson").mockResolvedValueOnce([
    {
      id: "scenario-growth",
      case_id: seededCaseId,
      name: "Freelance growth",
      typed_figures: {
        income: 145_000,
        deductions: 29_200,
        state: "CA",
        filing_status: "married_filing_jointly",
      },
      computed_result: {
        totalTax: "32100",
        deltaVBaseline: "4400",
      },
      created_at: "2026-08-05T12:00:00.000Z",
    },
    {
      id: "scenario-rental-sale",
      case_id: seededCaseId,
      name: "Rental sale",
      typed_figures: {
        income: 137_000,
        deductions: 30_200,
        state: "CA",
        filing_status: "married_filing_jointly",
      },
      computed_result: {
        totalTax: "30800",
        deltaVBaseline: "3100",
      },
      created_at: "2026-08-05T12:00:00.000Z",
    },
  ]);
}

async function submitTwoScenarios() {
  fireEvent.click(await screen.findByRole("button", { name: "New scenario" }));

  fireEvent.change(screen.getByLabelText("Scenario Name"), {
    target: { value: "Freelance growth" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Add a consulting contract" },
  });
  fireEvent.change(screen.getByLabelText("Additional Income"), {
    target: { value: "20000.00" },
  });
  fireEvent.change(screen.getByLabelText("Additional Deductions"), {
    target: { value: "1500.00" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Add additional scenario" }));

  const scenarioNameInputs = screen.getAllByLabelText("Scenario Name");
  const descriptionInputs = screen.getAllByLabelText("Description");
  const incomeInputs = screen.getAllByLabelText("Additional Income");
  const deductionInputs = screen.getAllByLabelText("Additional Deductions");
  const incomeTypeSelects = screen.getAllByLabelText("Income Type");

  fireEvent.change(scenarioNameInputs[1]!, {
    target: { value: "Rental sale" },
  });
  fireEvent.change(descriptionInputs[1]!, {
    target: { value: "Sell a rental property" },
  });
  fireEvent.change(incomeInputs[1]!, {
    target: { value: "12000.00" },
  });
  fireEvent.change(deductionInputs[1]!, {
    target: { value: "2500.00" },
  });
  fireEvent.change(incomeTypeSelects[1]!, {
    target: { value: "cg" },
  });

  fireEvent.click(screen.getByRole("button", { name: "Create Scenario" }));
}

describe("ScenarioPlannerPage", () => {
  test("renders the case gate when caseId is missing", async () => {
    renderScenarioPlannerRoute("/scenarios");

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Select a case to load Scenario Planner" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New scenario" })).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose an accessible Tax Plan Cycle from the selector above before this tool fetches or changes case data.",
      ),
    ).toBeInTheDocument();
  });

  test("opens and closes the scenario modal when a caseId is present", async () => {
    renderScenarioPlannerRoute(`/scenarios?caseId=${seededCaseId}`);

    expect(await screen.findByText("Signed in as Advisor")).toBeInTheDocument();
    expect(await screen.findByRole("combobox", { name: "Case ID" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "New scenario" })).toBeEnabled();
    expect(await screen.findByText("Scenario workspace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New scenario" }));
    expect(await screen.findByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
  });

  test("submits scenario figures and renders tax impact results in a table", async () => {
    const postSpy = mockScenarioResults();

    renderScenarioPlannerRoute(`/scenarios?caseId=${seededCaseId}`);

    expect(await screen.findByRole("table", { name: "Scenario results" })).toBeInTheDocument();
    expect(screen.getByText("Current baseline")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    await submitTwoScenarios();

    expect(await screen.findByText("Freelance growth")).toBeInTheDocument();
    expect(screen.getByText("Rental sale")).toBeInTheDocument();
    expect(screen.getByText("$27,700")).toBeInTheDocument();
    expect(screen.getByText("+$4,400")).toBeInTheDocument();
    expect(screen.getByText("+$3,100")).toBeInTheDocument();
    expect(screen.getByText("$32,100")).toBeInTheDocument();
    expect(screen.getByText("$30,800")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "New What-If Scenario" })).not.toBeInTheDocument();
    expect(postSpy).toHaveBeenCalledWith(
      `/v1/tax-plan-cycles/${seededCaseId}/scenarios`,
      {
        baseline: {
          income: 125_000,
          deductions: 27_700,
          state: "CA",
          filing_status: "married_filing_jointly",
        },
        scenarios: [
          {
            name: "Freelance growth",
            typed_figures: {
              income: 145_000,
              deductions: 29_200,
              state: "CA",
              filing_status: "married_filing_jointly",
            },
          },
          {
            name: "Rental sale",
            typed_figures: {
              income: 137_000,
              deductions: 30_200,
              state: "CA",
              filing_status: "married_filing_jointly",
            },
          },
        ],
      },
      expect.any(Function),
    );
  });

  test("renders loading and error states around scenario calculation requests", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let rejectRequest: (error: Error) => void = () => undefined;
    vi.spyOn(caseApi, "caseApiPostJson").mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRequest = reject;
      }),
    );

    renderScenarioPlannerRoute(`/scenarios?caseId=${seededCaseId}`);

    await submitTwoScenarios();

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Calculating scenario results...",
    );

    rejectRequest(new Error("failed"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Scenario calculation failed. Check the case stage and try again.",
    );
    expect(screen.getByRole("dialog", { name: "New What-If Scenario" })).toBeInTheDocument();
  });
});
