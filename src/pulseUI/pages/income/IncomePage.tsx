/**
 * The income-source categories the screen will summarize once live data is wired.
 */
export type IncomeSourceCategory = "w2" | "1099" | "capital-gains" | "rental" | "other";
import { Plus, ReceiptText } from "lucide-react";
import styles from "./IncomePage.module.css";

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
}

const incomeKpis = [
  "W-2 Employment",
  "1099 Freelance",
  "Capital Gains",
  "Rental Income",
  "Other",
] as const;

/**
 * A presentation-only Income screen. Data loading and data-driven states are added later.
 */
export function IncomePage(_: IncomePageProps) {
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
        <button className={styles.addButton} type="button" disabled>
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
          Income event placeholder table
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
                <th>
                  <span className={styles.srOnly}>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody />
          </table>
        </div>

        <div className={styles.emptyState}>
          <ReceiptText aria-hidden="true" />
          <h3>No income events yet</h3>
          <p>Add your first income event to start tracking your tax liability.</p>
          <button className={styles.emptyStateButton} type="button" disabled>
            Add Income Event
          </button>
        </div>
      </section>
    </section>
  );
}

