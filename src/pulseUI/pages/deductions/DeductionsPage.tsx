import { Plus, CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { useDeductionsQuery } from "../../entities/deductionQueries.ts";
import { usePlanToolCase, useSetPlanToolCaseId } from "../../shared/usePlanToolCase.ts";
import styles from "./DeductionsPage.module.css";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
}: {
  deductions: readonly { amount: number }[];
  contextControl: ReactNode;
  queryState: "loading" | "error" | "data";
  onAddDeduction: () => void;
}) {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

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
          value="$950.55"
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

      <PanelCard title={null} description={null}>
        <p className={styles.stateCopy}>Deduction table wiring is disabled pending scrum-115.</p>
      </PanelCard>

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
      />
      {modal}
    </>
  );
}
