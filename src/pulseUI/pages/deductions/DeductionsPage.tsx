import { Plus, CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";

import styles from "./DeductionsPage.module.css";
import { DataTable } from "../../components/DataTable.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export type DeductionCategory =
  | "Business Expense"
  | "Home Office"
  | "Charitable Giving"
  | "Health & Medical"
  | "Education"
  | "Retirement Contribution"
  | "Other";

export interface DeductionRecord {
  id: string;
  date: string;
  description: string;
  category: DeductionCategory;
  amount: number;
}

export interface DeductionsScreenProps {
  deductions: readonly DeductionRecord[];
  isAddDeductionModalOpen: boolean;
  onAddDeduction: () => void;
  onCloseAddDeduction: () => void;
}

const deductionCategories: readonly DeductionCategory[] = [
  "Business Expense",
  "Home Office",
  "Charitable Giving",
  "Health & Medical",
  "Education",
  "Retirement Contribution",
  "Other",
] as const;

const deductionDescriptions = [
  "Client lunches and travel for business development",
  "Dedicated workspace and office supplies",
  "Donations to qualified charitable organizations",
  "Premiums and out-of-pocket health costs",
  "Tuition and certification fees",
  "IRA and retirement plan contribution review",
  "Miscellaneous deductible expense follow-up",
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildPlaceholderDeductions(): readonly DeductionRecord[] {
  const today = getTodayDateString();

  return Array.from({ length: 25 }, (_, index) => {
    const description =
      deductionDescriptions[index % deductionDescriptions.length] ?? "Deduction item";
    const category = deductionCategories[index % deductionCategories.length] ?? "Other";

    return {
      id: `DED-${String(index + 1).padStart(3, "0")}`,
      date: today,
      description: `${description} ${index + 1}`,
      category,
      amount: 780 + index * 145,
    } satisfies DeductionRecord;
  });
}

function DeductionsModal({
  id,
  isOpen,
  onClose,
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.modalOverlay}
      role="presentation"
      onClick={() => {
        onClose();
      }}
    >
      <section
        aria-labelledby={id}
        aria-modal="true"
        className={styles.modal}
        role="dialog"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalKicker}>Deductions</p>
            <h2 id={id} className={styles.modalTitle}>
              Add Deduction
            </h2>
          </div>
          <button className={styles.modalCloseButton} type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className={styles.modalBody}>
          <p className={styles.modalCopy}>Placeholder modal shell for a later ticket.</p>
        </div>
      </section>
    </div>
  );
}

export function DeductionsScreen({
  deductions,
  isAddDeductionModalOpen,
  onAddDeduction,
  onCloseAddDeduction,
}: DeductionsScreenProps) {
  const modalTitleId = useId();
  const totalDeductions = deductions.reduce((sum, deduction) => sum + deduction.amount, 0);

  const columns = [
    {
      header: "Date",
      render: (row: DeductionRecord) => (
        <time dateTime={row.date} className={styles.dateCell}>
          {row.date}
        </time>
      ),
    },
    {
      header: "Description",
      render: (row: DeductionRecord) => row.description,
    },
    {
      header: "Category",
      render: (row: DeductionRecord) => <span className={`${styles.badge} ${styles.badgeBlue}`}>{row.category}</span>,
    },
    {
      header: "Amount",
      render: (row: DeductionRecord) => formatCurrency(row.amount),
      cellClassName: styles.amountCell,
    },
    {
      header: "Tax Impact",
      render: (row: DeductionRecord) => formatCurrency(-row.amount),
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

      <DeductionsModal
        id={modalTitleId}
        isOpen={isAddDeductionModalOpen}
        onClose={onCloseAddDeduction}
      />
    </div>
  );
}

export function DeductionsPage() {
  const [isAddDeductionModalOpen, setIsAddDeductionModalOpen] = useState(false);
  const deductions = buildPlaceholderDeductions();

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
