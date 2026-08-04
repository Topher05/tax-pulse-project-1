import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";

import { IncomeEntryForm } from "./IncomeEntryForm.tsx";
import type { IncomeSourceCategory } from "./incomeEntrySchema.ts";
import type { IncomeCreatePayload } from "./incomeEntrySchema.ts";
import styles from "./IncomePage.module.css";

export type { IncomeSourceCategory } from "./incomeEntrySchema.ts";

/**
 * Presentation contract for an income entry returned by the future income boundary.
 */
export interface IncomeEvent {
  id: string;
  date: string;
  source: string;
  category: IncomeSourceCategory;
  amount: number;
  withholding: number;
}

/**
 * Data the Income screen will receive once its query boundary is introduced.
 */
export interface IncomePageProps {
  clientId: string;
  taxYear: number;
  incomeEvents: readonly IncomeEvent[];
  onCreateIncome: (payload: IncomeCreatePayload) => void | Promise<void>;
}

const incomeKpis = [
  "W-2 Employment",
  "1099 Freelance",
  "Capital Gains",
  "Rental Income",
  "Other",
] as const;

const incomeTypeLabels: Record<IncomeSourceCategory, string> = {
  w2: "W-2",
  "1099": "1099",
  "capital-gains": "Capital Gains",
  rental: "Rental",
  other: "Other",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * A presentation-only Income screen. Query loading and error states are added later.
 */
export function IncomePage({ incomeEvents, onCreateIncome }: IncomePageProps) {
  const [isAddIncomeFormOpen, setIsAddIncomeFormOpen] = useState(false);

  return (
    <section className={styles.page} aria-labelledby="income-page-title">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title} id="income-page-title">
            Income Events
          </h2>
          <p className={styles.description}>
            Track all income sources for accurate tax estimation
          </p>
        </div>
        <button
          className={styles.addButton}
          type="button"
          onClick={() => setIsAddIncomeFormOpen(true)}
        >
          <Plus aria-hidden="true" />
          Add Income
        </button>
      </header>

      <section className={styles.kpiGrid} aria-label="Income source summaries">
        {incomeKpis.map((label) => (
          <article className={styles.kpiCard} key={label}>
            <p className={styles.kpiLabel}>{label}</p>
            <p className={styles.kpiValue} aria-label={`${label} placeholder value`}>
              —
            </p>
          </article>
        ))}
      </section>

      <section className={styles.tableCard} aria-labelledby="income-table-title">
        <h3 className={styles.srOnly} id="income-table-title">
          Income events
        </h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Withholding</th>
              </tr>
            </thead>
            <tbody>
              {incomeEvents.map((incomeEvent) => (
                <tr key={incomeEvent.id}>
                  <td>{formatDate(incomeEvent.date)}</td>
                  <td>{incomeEvent.source}</td>
                  <td>{incomeTypeLabels[incomeEvent.category]}</td>
                  <td>{currencyFormatter.format(incomeEvent.amount)}</td>
                  <td>{currencyFormatter.format(incomeEvent.withholding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {incomeEvents.length === 0 ? (
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
        ) : null}
      </section>

      {isAddIncomeFormOpen ? (
        <IncomeEntryForm
          onCreate={onCreateIncome}
          onClose={() => setIsAddIncomeFormOpen(false)}
        />
      ) : null}
    </section>
  );
}

