import styles from "./IncomeBreakdownChart.module.css";
import type { DashboardChartData } from "./dashboardChartData.ts";

interface IncomeBreakdownChartProps {
  incomeBySource: DashboardChartData["incomeBySource"];
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function IncomeBreakdownChart({ incomeBySource }: IncomeBreakdownChartProps) {
  const totalIncome = incomeBySource.reduce((total, source) => total + source.amount, 0);

  return (
    <ul className={styles.list} aria-label="Income by source">
      {incomeBySource.map((incomeSource) => {
        const share = totalIncome > 0 ? (incomeSource.amount / totalIncome) * 100 : 0;

        return (
          <li className={styles.item} key={incomeSource.source}>
            <div className={styles.heading}>
              <span className={styles.source}>{incomeSource.source}</span>
              <span className={styles.amount}>{currencyFormatter.format(incomeSource.amount)}</span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <div className={styles.bar} style={{ width: `${share}%` }} />
            </div>
            <span className={styles.share}>{Math.round(share)}% of total income</span>
          </li>
        );
      })}
    </ul>
  );
}
