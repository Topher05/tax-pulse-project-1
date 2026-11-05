import { Plus, ReceiptText, RefreshCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { EmptyState } from "../../components/EmptyState.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import {
  type IncomeEventRecord,
  type IncomeSourceCategory,
  useCreateIncomeEventMutation,
  useIncomeEventsQuery,
} from "../../entities/incomeQueries.ts";
import { usePlanToolCase, useSetPlanToolRouteKey } from "../../shared/usePlanToolCase.ts";
import { IncomeEntryForm } from "./IncomeEntryForm.tsx";
import type { IncomeCreatePayload } from "./incomeEntrySchema.ts";
import styles from "./IncomePage.module.css";

export type { IncomeSourceCategory } from "../../entities/incomeQueries.ts";

/**
 * Presentation contract for an income entry returned by the future income boundary.
 */
export interface IncomeEvent {
  id: string;
  date: string;
  source: string;
  type: IncomeSourceCategory;
  amount: number;
  withholding: number;
}

/**
 * Data the Income screen will receive once its query boundary is introduced.
 */
export interface IncomePageProps {
  incomeEvents: readonly IncomeEvent[];
  contextControl?: ReactNode;
  queryState: "loading" | "error" | "empty" | "data";
  errorMessage?: string;
  onCreateIncome: (payload: IncomeCreatePayload) => void | Promise<void>;
  onRetry: () => void;
}

const incomeTypeLabels: Record<IncomeSourceCategory, string> = {
  w2: "W-2",
  "1099": "1099",
  "capital-gains": "Capital Gains",
  rental: "Rental",
  other: "Other",
};

const incomeTypes: readonly IncomeSourceCategory[] = [
  "w2",
  "1099",
  "capital-gains",
  "rental",
  "other",
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function toIncomeEvent(record: IncomeEventRecord): IncomeEvent {
  return {
    id: record.id,
    date: record.date,
    source: record.source,
    type: record.type,
    amount: record.amount,
    withholding: record.withholding,
  };
}

function IncomeLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <section className={styles.tableCard} aria-labelledby="income-loading-title">
      <h3 className={styles.srOnly} id="income-loading-title">
        Loading income events
      </h3>
      <div className={styles.skeletonTable} role="status" aria-label="Loading income events">
        <span className={styles.srOnly}>Loading income events</span>
        <div className={styles.skeletonHeader}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
          </div>
        ))}
      </div>
    </section>
  );
}

function IncomeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="Income events could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
  );
}

/**
 * A typed Income screen. The route container owns data loading and passes the query state in.
 */
export function IncomeScreen({
  incomeEvents,
  contextControl,
  queryState,
  errorMessage,
  onCreateIncome,
  onRetry,
}: IncomePageProps) {
  const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = useState(false);

  return (
    <section
      className={styles.page}
      aria-labelledby="income-page-title"
      data-income-query-state={queryState}
    >
      <ToolHeader
        title="Income Events"
        titleId="income-page-title"
        description="Track all income sources for accurate tax estimation"
        contextControl={contextControl}
        action={
          <button
            className={styles.addButton}
            type="button"
            onClick={() => setIsAddIncomeFormOpen(true)}
          >
            <Plus aria-hidden="true" />
            Add Income
          </button>
        }
      />

      <section className={styles.kpiGrid} aria-label="Income source summaries">
        {incomeTypes.map((type) => {
          const label = incomeTypeLabels[type];
          const total = incomeEvents
            .filter((event) => event.type === type)
            .reduce((sum, event) => sum + event.amount, 0);

          return (
            <article className={styles.kpiCard} key={type}>
              <p className={styles.kpiLabel}>{label}</p>
              <p className={styles.kpiValue} aria-label={`${label} total`}>
                {formatCurrency(total)}
              </p>
            </article>
          );
        })}
      </section>

      {queryState === "loading" ? <IncomeLoadingState /> : null}
      {queryState === "error" ? (
        <IncomeErrorState
          message={errorMessage ?? "Income events request failed."}
          onRetry={onRetry}
        />
      ) : null}
      {queryState === "empty" ? (
        <section className={styles.tableCard} aria-labelledby="income-empty-title">
          <h3 className={styles.srOnly} id="income-empty-title">
            Empty income events
          </h3>
          <div className={styles.emptyState}>
            <ReceiptText aria-hidden="true" />
            <h3>No income events yet</h3>
            <p>Add your first income event to start tracking your tax liability.</p>
            <button
              className={styles.emptyStateButton}
              type="button"
              onClick={() => setIsAddIncomeFormOpen(true)}
            >
              Add Income Event
            </button>
          </div>
        </section>
      ) : null}
      {queryState === "data" ? (
        <section className={styles.tableCard} aria-labelledby="income-table-title">
          <h3 className={styles.srOnly} id="income-table-title">
            Income event table
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Income events">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Withholding</th>
                  <th>
                    <span className={styles.srOnly}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {incomeEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.date)}</td>
                    <td>{event.source}</td>
                    <td>
                      <span className={styles.badge}>{incomeTypeLabels[event.type]}</span>
                    </td>
                    <td className={styles.amountCell}>{formatCurrency(event.amount)}</td>
                    <td className={styles.amountCell}>{formatCurrency(event.withholding)}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isAddIncomeFormOpen ? (
        <IncomeEntryForm
          onCreate={onCreateIncome}
          onClose={() => setIsAddIncomeFormOpen(false)}
        />
      ) : null}
    </section>
  );
}

export function IncomePage() {
  const { caseId, routeKey, hasInvalidCaseId } = usePlanToolCase();
  const setRouteKey = useSetPlanToolRouteKey();
  const contextControl = <CurrentCaseSelector routeKey={routeKey} onRouteKeyChange={setRouteKey} />;
  const incomeEventsQuery = useIncomeEventsQuery(caseId);
  const createIncomeEventMutation = useCreateIncomeEventMutation(caseId);

  if (caseId === null || hasInvalidCaseId) {
    return (
      <section className={styles.page} aria-labelledby="income-page-title">
        <ToolHeader
          title="Income Events"
          titleId="income-page-title"
          description="Track all income sources for accurate tax estimation"
          contextControl={contextControl}
        />
        <PlanToolCaseGate hasInvalidCaseId={hasInvalidCaseId} toolName="income events" />
      </section>
    );
  }

  const queryState = incomeEventsQuery.isLoading
    ? "loading"
    : incomeEventsQuery.isError
      ? "error"
      : incomeEventsQuery.data?.length === 0
        ? "empty"
        : "data";

  return (
    <IncomeScreen
      incomeEvents={(incomeEventsQuery.data ?? []).map(toIncomeEvent)}
      contextControl={contextControl}
      queryState={queryState}
      errorMessage={
        incomeEventsQuery.error instanceof Error
          ? incomeEventsQuery.error.message
          : "Income events request failed."
      }
      onCreateIncome={async (payload) => {
        await createIncomeEventMutation.mutateAsync(payload);
      }}
      onRetry={() => {
        void incomeEventsQuery.refetch();
      }}
    />
  );
}
