import { Plus, CircleCheckBig, HandCoins, RefreshCw, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { EmptyState } from "../../components/EmptyState.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import {
  type DeductionQueryRecord,
  useDeductionsQuery,
} from "../../entities/deductionQueries.ts";
import { usePlanToolCase, useSetPlanToolCaseId } from "../../shared/usePlanToolCase.ts";
import styles from "./DeductionsPage.module.css";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function DeductionsLoadingState() {
  const skeletonRows = Array.from({ length: 5 }, (_, index) => index);

  return (
    <PanelCard
      title="Loading deductions"
      description="Fetching the selected case's deduction records."
    >
      <div className={styles.skeletonTable} role="status" aria-label="Loading deductions">
        <span className="srOnly">Loading deductions</span>
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
    </PanelCard>
  );
}

function DeductionsEmptyState() {
  return (
    <EmptyState
      title="No deductions yet"
      description="This case has no recorded deductions."
      icon={<HandCoins />}
    />
  );
}

function DeductionsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="Deductions could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
  );
}

export interface DeductionRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

function DeductionsScreen({
  deductions,
  contextControl,
  queryState,
  onAddDeduction,
  onRetry,
  errorMessage,
}: {
  deductions: readonly DeductionQueryRecord[];
  contextControl: ReactNode;
  queryState: "loading" | "error" | "empty" | "data";
  onAddDeduction: () => void;
  onRetry: () => void;
  errorMessage?: string;
}) {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const estimatedTaxSavings = deductions.reduce(
    (sum, deduction) => sum + deduction.tax_impact,
    0,
  );

  return (
    <div className={styles.page} data-deductions-query-state={queryState}>
      <ToolHeader
        title="Deductions & Expenses"
        contextControl={contextControl}
        action={
          <button
            className={`${styles.launchButton} disabled:cursor-not-allowed disabled:opacity-50`}
            type="button"
            aria-disabled={false}
            onClick={onAddDeduction}
          >
            <Plus aria-hidden="true" />
            Add Deduction
          </button>
        }
      />

      <section className={styles.metricGrid} aria-label="Deductions KPI region">
        <MetricCard
          label="Total Deductions"
          value={formatCurrency(totalDeductions)}
          caption=""
          tone="indigo"
          icon={<HandCoins aria-hidden="true" />}
        />
        <MetricCard
          label="Estimated Tax Savings"
          value={formatCurrency(estimatedTaxSavings)}
          caption=""
          tone="green"
          icon={<CircleCheckBig aria-hidden="true" />}
          valueClassName={styles.greenValue}
        />
        <MetricCard
          label="Deduction Method"
          value="Standard ($12,500)"
          caption=""
          tone="amber"
          icon={<ShieldAlert aria-hidden="true" />}
        />
      </section>

      {queryState === "loading" ? <DeductionsLoadingState /> : null}
      {queryState === "empty" ? <DeductionsEmptyState /> : null}
      {queryState === "error" ? (
        <DeductionsErrorState
          message={errorMessage ?? "Deductions request failed."}
          onRetry={onRetry}
        />
      ) : null}
      {queryState === "data" ? (
        <PanelCard title={null} description={null}>
          <p className={styles.stateCopy}>Deduction table wiring is disabled pending scrum-115.</p>
        </PanelCard>
      ) : null}

      <footer className={styles.pageFooter}>Track deductible expenses to reduce your tax liability</footer>
    </div>
  );
}

export function DeductionsPage() {
  const { caseId, hasInvalidCaseId } = usePlanToolCase();
  const setCaseId = useSetPlanToolCaseId();
  const contextControl = <CurrentCaseSelector caseId={caseId} onCaseIdChange={setCaseId} />;
  const [isAddDeductionModalOpen, setIsAddDeductionModalOpen] = useState(false);
  const deductionsQuery = useDeductionsQuery(caseId);

  if (caseId === null || hasInvalidCaseId) {
    return (
      <div className={styles.page}>
        <ToolHeader
          title="Deductions & Expenses"
          contextControl={contextControl}
        />
        <PlanToolCaseGate hasInvalidCaseId={hasInvalidCaseId} toolName="deductions" />
      </div>
    );
  }

  const queryState = deductionsQuery.isLoading
    ? "loading"
    : deductionsQuery.isError
      ? "error"
      : deductionsQuery.data?.length === 0
        ? "empty"
      : "data";

  const modal = isAddDeductionModalOpen ? (
    <DeductionEntryForm onClose={() => setIsAddDeductionModalOpen(false)} />
  ) : null;

  return (
    <>
      <DeductionsScreen
        deductions={deductionsQuery.data ?? []}
        contextControl={contextControl}
        queryState={queryState}
        onAddDeduction={() => {
          setIsAddDeductionModalOpen(true);
        }}
        onRetry={() => {
          void deductionsQuery.refetch();
        }}
        errorMessage={
          deductionsQuery.error instanceof Error
            ? deductionsQuery.error.message
            : "Deductions request failed."
        }
      />
      {modal}
    </>
  );
}
