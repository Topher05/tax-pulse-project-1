import { Plus, CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { DeductionEntryForm } from "../../components/DeductionEntryForm.tsx";
import { DataTable } from "../../components/DataTable.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import {
  type DeductionQueryRecord,
  useDeductionsQuery,
} from "../../entities/deductionQueries.ts";
import styles from "./DeductionsPage.module.css";

const defaultClientId = "client-123";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildColumns() {
  return [
    {
      header: "Date",
      render: (row: DeductionQueryRecord) => (
        <time dateTime={row.date} className={styles.dateCell}>
          {row.date}
        </time>
      ),
    },
    {
      header: "Description",
      render: (row: DeductionQueryRecord) => row.description,
    },
    {
      header: "Category",
      render: (row: DeductionQueryRecord) => (
        <span className={`${styles.badge} ${styles.badgeBlue}`}>{row.category}</span>
      ),
    },
    {
      header: "Amount",
      render: (row: DeductionQueryRecord) => formatCurrency(row.amount),
      cellClassName: styles.amountCell,
    },
    {
      header: "Tax Impact",
      render: (row: DeductionQueryRecord) => formatCurrency(-row.amount),
      cellClassName: styles.taxImpactCell,
    },
    {
      header: "ACTION",
      render: () => (
        <button className={styles.removeButton} type="button">
          Remove
        </button>
      ),
    },
  ] as const;
}

function DeductionsScreen({
  deductions,
  onAddDeduction,
  onCloseAddDeduction,
  isAddDeductionModalOpen,
}: {
  deductions: readonly DeductionQueryRecord[];
  onAddDeduction: () => void;
  onCloseAddDeduction: () => void;
  isAddDeductionModalOpen: boolean;
}) {
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const columns = buildColumns();

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
        <DataTable
          ariaLabel="Deduction records"
          columns={columns}
          rows={deductions}
          rowKey={(row) => row.id}
        />
      </PanelCard>

      <footer className={styles.pageFooter}>Track deductible expenses to reduce your tax liability</footer>

      {isAddDeductionModalOpen ? <DeductionEntryForm onClose={onCloseAddDeduction} /> : null}
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
  const query = useDeductionsQuery(defaultClientId);
  const addDeductionAction = (
    <button className={styles.launchButton} type="button" onClick={() => setIsAddDeductionModalOpen(true)}>
      <Plus aria-hidden="true" />
      Add Deduction
    </button>
  );

  if (query.isLoading) {
    return (
      <DeductionsPageChrome action={addDeductionAction}>
        <PanelCard title={null} description={null}>
          <p className={styles.stateCopy}>Loading deductions...</p>
        </PanelCard>
      </DeductionsPageChrome>
    );
  }

  if (query.isError) {
    return (
      <DeductionsPageChrome action={addDeductionAction}>
        <PanelCard title={null} description={null}>
          <p className={styles.stateCopy}>Unable to load deductions.</p>
        </PanelCard>
      </DeductionsPageChrome>
    );
  }

  const deductions = query.data?.deductions;

  if (deductions === undefined) {
    return null;
  }

  return (
    <DeductionsScreen
      deductions={deductions}
      isAddDeductionModalOpen={isAddDeductionModalOpen}
      onAddDeduction={() => {
        setIsAddDeductionModalOpen(true);
      }}
      onCloseAddDeduction={() => {
        setIsAddDeductionModalOpen(false);
      }}
    />
  );
}
