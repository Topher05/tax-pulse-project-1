import { Plus, CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";
import { useId, useState } from "react";

import styles from "./DeductionsPage.module.css";
import { DataTable } from "../../components/DataTable.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export type DeductionStatus = "Ready" | "Planned" | "Needs Review" | "Applied";
export type DeductionCadence = "One-time" | "Monthly" | "Quarterly" | "Annual";

export interface DeductionRecord {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: DeductionCadence;
  status: DeductionStatus;
  note: string;
}

export interface DeductionsScreenProps {
  deductions: readonly DeductionRecord[];
  isAddDeductionModalOpen: boolean;
  onAddDeduction: () => void;
  onCloseAddDeduction: () => void;
}

const deductionStatuses: readonly DeductionStatus[] = [
  "Ready",
  "Planned",
  "Needs Review",
  "Applied",
] as const;

const deductionCategories = [
  "Retirement",
  "State Tax",
  "Business",
  "Healthcare",
  "Education",
  "Property",
] as const;

const deductionCadences: readonly DeductionCadence[] = [
  "Annual",
  "Quarterly",
  "Monthly",
  "One-time",
] as const;

const deductionNames = [
  "Retirement contribution",
  "Home office allocation",
  "Charitable gifts",
  "Health savings deposit",
  "Business mileage log",
  "Continuing education",
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPlaceholderDeductions(): readonly DeductionRecord[] {
  return Array.from({ length: 25 }, (_, index) => {
    const name = deductionNames[index % deductionNames.length] ?? "Deduction item";
    const category = deductionCategories[index % deductionCategories.length] ?? "General";
    const cadence = deductionCadences[index % deductionCadences.length] ?? "Annual";
    const status = deductionStatuses[index % deductionStatuses.length] ?? "Planned";

    return {
      id: `DED-${String(index + 1).padStart(3, "0")}`,
      name: `${name} ${index + 1}`,
      category,
      amount: 780 + index * 145,
      cadence,
      status,
      note: "Placeholder deduction record for the initial screen scaffold.",
    } satisfies DeductionRecord;
  });
}

function getStatusTone(status: DeductionStatus): "success" | "warning" | "info" | "neutral" {
  switch (status) {
    case "Ready":
      return "success";
    case "Needs Review":
      return "warning";
    case "Applied":
      return "neutral";
    case "Planned":
      return "info";
  }
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
      header: "Deduction",
      render: (row: DeductionRecord) => (
        <div className={styles.deductionNameCell}>
          <span className={styles.deductionName}>{row.name}</span>
          <span className={styles.deductionNote}>{row.note}</span>
        </div>
      ),
    },
    {
      header: "Category",
      render: (row: DeductionRecord) => row.category,
    },
    {
      header: "Cadence",
      render: (row: DeductionRecord) => row.cadence,
    },
    {
      header: "Amount",
      render: (row: DeductionRecord) => formatCurrency(row.amount),
      cellClassName: styles.amountCell,
    },
    {
      header: "Status",
      render: (row: DeductionRecord) => <StatusPill tone={getStatusTone(row.status)}>{row.status}</StatusPill>,
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
        />
        <MetricCard
          label="Deduction Method"
          value="Standard ($12,500)"
          caption=""
          tone="amber"
          icon={<ShieldAlert aria-hidden="true" />}
        />
      </section>

      <PanelCard
        title="Deduction Records"
        description="Inert placeholder records for the deductions screen scaffold."
      >
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
