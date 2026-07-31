import { Plus, CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { type DeductionQueryRecord, useDeductionsQuery } from "../../entities/deductionQueries.ts";
import styles from "./DeductionsPage.module.css";

const defaultCaseId = "your Case ID here"; // TODO: Remove this once we have case-id wired up via the scenarios ticket, for now this will serve as a manual entry point

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function DeductionsScreen({
  deductions,
  onAddDeduction,
}: {
  deductions: readonly DeductionQueryRecord[];
  onAddDeduction: () => void;
}) {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

  return (
    <div className={styles.page}>
      <ToolHeader
        title="Deductions & Expenses"
        action={
          <button className={styles.launchButton} type="button" onClick={onAddDeduction}>
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

function DeductionsPageChrome({
  action,
  children,
}: {
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <ToolHeader title="Deductions & Expenses" action={action} />
      {children}
    </div>
  );
}

export function DeductionsPage() {
  const [isAddDeductionModalOpen, setIsAddDeductionModalOpen] = useState(false);
  const query = useDeductionsQuery(defaultCaseId);

  useEffect(() => {
    // TODO: Post integration this block can be removed
    console.info(`Loader results are ${query.status} integration of data and load states is in 115, 113`);
    if (query.data === undefined || query.data.length === 0) {
      return;
    }

    console.table(query.data);
  }, [query.data]);

  const modal = isAddDeductionModalOpen ? (
    <DeductionEntryForm onClose={() => setIsAddDeductionModalOpen(false)} />
  ) : null;
  const footer = (
    <footer className={styles.pageFooter}>Track deductible expenses to reduce your tax liability</footer>
  );
  const addDeductionAction = (
    <button className={styles.launchButton} type="button" onClick={() => setIsAddDeductionModalOpen(true)}>
      <Plus aria-hidden="true" />
      Add Deduction
    </button>
  );

  if (query.isLoading) {
    return (
      <>
        <DeductionsPageChrome action={addDeductionAction}>
          <PanelCard title={null} description={null}>
            <p className={styles.stateCopy}>Loading deductions...</p>
          </PanelCard>
        </DeductionsPageChrome>
        {footer}
        {modal}
      </>
    );
  }

  if (query.isError) {
    return (
      <>
        <DeductionsPageChrome action={addDeductionAction}>
          <PanelCard title={null} description={null}>
            <p className={styles.stateCopy}>Unable to load deductions.</p>
          </PanelCard>
        </DeductionsPageChrome>
        {footer}
        {modal}
      </>
    );
  }

  const deductions = query.data;

  if (deductions === undefined) {
    return null;
  }

  return (
    <>
      <DeductionsScreen
        deductions={deductions}
        onAddDeduction={() => {
          setIsAddDeductionModalOpen(true);
        }}
      />
      {footer}
      {modal}
    </>
  );
}
