import { Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import styles from "./ScenarioPlannerPage.module.css";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ScenarioForm } from "../../components/ScenarioForm.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { useAuthenticatedFetch } from "../../auth/authenticatedFetch.ts";
import {
  scenarioBaseline,
  submitScenarioResults,
  type ScenarioResultsView,
} from "../../entities/scenarioResults.ts";
import type { ScenarioFormValues } from "../../components/scenario-form/schema.ts";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "Pending";
  }

  return currencyFormatter.format(value);
}

function formatDelta(value: number): string {
  const formatted = currencyFormatter.format(Math.abs(value));

  if (value < 0) {
    return `-${formatted}`;
  }

  if (value > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

interface ScenarioTableRow {
  id: string;
  name: string;
  taxableIncome: number;
  totalTax: number | null;
  deltaVsBaseline: number;
}

const scenarioTableFeatures = tableFeatures({});
const scenarioColumnHelper = createColumnHelper<
  typeof scenarioTableFeatures,
  ScenarioTableRow
>();
const scenarioColumns = scenarioColumnHelper.columns([
  scenarioColumnHelper.accessor("name", {
    header: "Scenario",
    cell: ({ row }) => (
      <span className={row.original.id === "baseline" ? styles.baselineName : undefined}>
        {row.original.name}
      </span>
    ),
  }),
  scenarioColumnHelper.accessor("taxableIncome", {
    header: "Taxable",
    cell: ({ row }) => formatCurrency(row.original.taxableIncome),
  }),
  scenarioColumnHelper.accessor("totalTax", {
    header: "Total Tax",
    cell: ({ row }) => formatCurrency(row.original.totalTax),
  }),
  scenarioColumnHelper.accessor("deltaVsBaseline", {
    header: "Delta",
    cell: ({ row }) => (
      <span
        className={
          row.original.deltaVsBaseline < 0
            ? styles.deltaGood
            : row.original.deltaVsBaseline > 0
              ? styles.deltaWarn
              : styles.deltaNeutral
        }
      >
        {formatDelta(row.original.deltaVsBaseline)}
      </span>
    ),
  }),
]);

function ScenarioResultsTable({
  results,
}: {
  results: ScenarioResultsView;
}) {
  const rows = useMemo<ScenarioTableRow[]>(
    () => [
      {
        id: "baseline",
        name: "Current baseline",
        taxableIncome: results.baseline.taxableIncome,
        totalTax: results.baseline.totalTax,
        deltaVsBaseline: 0,
      },
      ...results.rows,
    ],
    [results],
  );
  const table = useTable({
    columns: scenarioColumns,
    data: rows,
    features: scenarioTableFeatures,
  });

  return (
    <div className={styles.tableWrap}>
      <table className={styles.resultsTable} aria-label="Scenario results">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cell.column.id === "name" ? undefined : styles.moneyCell}
                >
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScenarioPlannerPage() {
  const search = useSearch({ from: "/_workspace/scenarios" });
  const navigate = useNavigate({ from: "/scenarios" });
  const authenticatedFetch = useAuthenticatedFetch();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [results, setResults] = useState<ScenarioResultsView>({
    baseline: scenarioBaseline,
    rows: [],
  });
  const caseId = search.caseId ?? null;
  const hasInvalidCaseId = search.invalidCaseId ?? false;
  const scenarioMutation = useMutation({
    mutationFn: (values: ScenarioFormValues) => {
      if (caseId === null) {
        throw new Error("A case must be selected before submitting scenarios.");
      }

      return submitScenarioResults(caseId, values, authenticatedFetch);
    },
    onSuccess: (nextResults) => {
      setResults(nextResults);
    },
  });

  const headerAction = (
    <button
      className={`${styles.launchButton} disabled:cursor-not-allowed disabled:opacity-50`}
      type="button"
      disabled={caseId === null}
      onClick={() => {
        setIsModalOpen(true);
      }}
    >
      <Plus aria-hidden="true" />
      New scenario
    </button>
  );

  return (
    <section className={styles.page}>
      <ToolHeader
        title="Scenario Planner"
        contextControl={
          <CurrentCaseSelector
            caseId={caseId}
            onCaseIdChange={(nextCaseId) => {
              void navigate({
                search: {
                  caseId: nextCaseId,
                },
                replace: true,
              });
            }}
          />
        }
        action={headerAction}
      />

      {caseId ? (
        <>
          <div className={styles.launchCard}>
            <div className={styles.launchCopy}>
              <p className={styles.launchKicker}>Scenario workspace</p>
              <p className={styles.launchDescription}>
                Open the modal to capture a new what-if scenario for this advisory workflow.
              </p>
            </div>
          </div>

          <section className={styles.tableShell} aria-label="Scenario table area">
            <div className={styles.tableHeader}>
              <div>
                <p className={styles.launchKicker}>Scenario results</p>
                <h2 className={styles.tableTitle}>Tax impact comparison</h2>
              </div>
              <p className={styles.tableMeta}>
                Baseline taxable: {formatCurrency(results.baseline.taxableIncome)}
              </p>
            </div>

            {scenarioMutation.isPending ? (
              <div className={styles.statePanel} role="status">
                Calculating scenario results...
              </div>
            ) : scenarioMutation.isError ? (
              <div className={styles.statePanel} role="alert">
                Scenario calculation failed. Check the case stage and try again.
              </div>
            ) : (
              <ScenarioResultsTable results={results} />
            )}
          </section>

          {isModalOpen ? (
            <ScenarioForm
              onClose={() => setIsModalOpen(false)}
              onSubmit={async (values) => {
                await scenarioMutation.mutateAsync(values);
              }}
            />
          ) : null}
        </>
      ) : (
        <PlanToolCaseGate hasInvalidCaseId={hasInvalidCaseId} toolName="Scenario Planner" />
      )}
    </section>
  );
}
