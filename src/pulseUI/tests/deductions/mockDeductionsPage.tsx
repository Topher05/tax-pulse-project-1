import { useId, useState } from "react";
import { DataTable } from "../../components/DataTable.tsx";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import type { DeductionRecord } from "../../pages/deductions/DeductionsPage.tsx";
import styles from "../../pages/deductions/DeductionsPage.module.css";
/*
  TODO Once deductions page feature development is complete via Jira-112 - 115 remove this mock and resolve tests in the real page
  - This mock can be deprecated by just commenting it out, can be preserve for cdo
*/
const deductionColumns = [
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
    header: "Action",
    render: () => (
      <button className={styles.removeButton} type="button">
        Remove
      </button>
    ),
  },
] as const;

const defaultDeductions = [
  {
    id: "DED-001",
    date: "2026-08-01",
    description: "Client dinner with referral partner",
    category: "Business Expense",
    amount: 780,
  },
  {
    id: "DED-002",
    date: "2026-08-02",
    description: "Home office monitor and desk chair",
    category: "Home Office",
    amount: 925,
  },
] satisfies readonly DeductionRecord[];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildMockDeductions(): readonly DeductionRecord[] {
  return defaultDeductions;
}

export function MockDeductionsPage({
  deductions,
}: {
  deductions: readonly DeductionRecord[];
}) {
  const descriptionId = useId();
  const categoryId = useId();
  const amountId = useId();
  const errorId = useId();
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DeductionRecord["category"]>("Business Expense");
  const [amount, setAmount] = useState("780");

  const validationError =
    isFormSubmitted && description.trim().length === 0 ? "Description is required." : null;

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.modalKicker}>Plan tools</p>
        <h1 className={styles.modalTitle}>Deductions &amp; Expenses</h1>
        <p className={styles.modalCopy}>Track deductible expenses while the production UI is still being wired.</p>
      </header>

      <section aria-label="Deductions KPI region" className={styles.metricGrid}>
        <MetricCard
          label="Total Deductions"
          value={formatCurrency(deductions.reduce((sum, deduction) => sum + deduction.amount, 0))}
          caption=""
          tone="indigo"
          icon={<span aria-hidden="true">$</span>}
        />
        <MetricCard
          label="Estimated Tax Savings"
          value="$950"
          caption=""
          tone="green"
          icon={<span aria-hidden="true">%</span>}
        />
        <MetricCard
          label="Deduction Method"
          value="Standard ($12,500)"
          caption=""
          tone="amber"
          icon={<span aria-hidden="true">!</span>}
        />
      </section>

      <section
        aria-labelledby="mock-deductions-form-title"
        className={styles.modal}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.modalKicker}>Deductions</p>
            <h2 id="mock-deductions-form-title" className={styles.modalTitle}>
              Add Deduction
            </h2>
          </div>
        </header>

        <form
          className={styles.modalBody}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setIsFormSubmitted(true);
          }}
        >
          <div>
            <label htmlFor={descriptionId}>Description</label>
            <input
              id={descriptionId}
              name="description"
              type="text"
              value={description}
              aria-invalid={validationError ? "true" : "false"}
              aria-describedby={validationError ? errorId : undefined}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
          </div>

          <div>
            <label htmlFor={categoryId}>Category</label>
            <select
              id={categoryId}
              name="category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as DeductionRecord["category"]);
              }}
            >
              <option>Business Expense</option>
              <option>Home Office</option>
              <option>Charitable Giving</option>
              <option>Health &amp; Medical</option>
              <option>Education</option>
              <option>Retirement Contribution</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label htmlFor={amountId}>Amount</label>
            <input
              id={amountId}
              name="amount"
              inputMode="numeric"
              type="number"
              min="0"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
              }}
            />
          </div>

          <button type="submit">Save Deduction</button>

          {validationError ? (
            <p id={errorId} role="alert" aria-live="assertive">
              {validationError}
            </p>
          ) : null}
        </form>
      </section>

      <PanelCard title={null} description={null}>
        <DataTable
          ariaLabel="Deduction records"
          columns={deductionColumns}
          rows={deductions}
          rowKey={(row) => row.id}
          emptyMessage="No deductions recorded yet."
        />
      </PanelCard>
    </main>
  );
}
