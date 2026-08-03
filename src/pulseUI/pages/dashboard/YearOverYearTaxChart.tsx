import styles from "./YearOverYearTaxChart.module.css";
import type { DashboardYearOverYearTax } from "./dashboardChartData.ts";

interface YearOverYearTaxChartProps {
  comparison: DashboardYearOverYearTax;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function YearOverYearTaxChart({ comparison }: YearOverYearTaxChartProps) {
  const values = [
    { year: comparison.priorYear, tax: comparison.priorYearTax, tone: "prior" as const },
    { year: comparison.currentYear, tax: comparison.currentYearTax, tone: "current" as const },
  ];
  const largestTax = Math.max(...values.map((value) => value.tax), 1);

  return (
    <div className={styles.chart} role="img" aria-label="Year-over-year estimated total tax">
      <ol className={styles.rows}>
        {values.map((value) => (
          <li className={styles.row} key={value.year}>
            <div className={styles.heading}>
              <span className={styles.year}>{value.year}</span>
              <span className={styles.amount}>{currencyFormatter.format(value.tax)}</span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <div
                className={[styles.bar, styles[`bar${value.tone}`]].join(" ")}
                style={{ width: `${(value.tax / largestTax) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
