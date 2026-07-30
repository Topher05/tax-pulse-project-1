/**
 * The income-source categories the screen will summarize once live data is wired.
 */
export type IncomeSourceCategory = "w2" | "1099" | "capital-gains" | "rental" | "other";

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

/**
 * A presentation-only Income screen. Data loading and data-driven states are added later.
 */
export function IncomePage(_: IncomePageProps) {
  return (
    <section aria-labelledby="income-page-title">
      <h2 id="income-page-title">Income</h2>
    </section>
  );
}
