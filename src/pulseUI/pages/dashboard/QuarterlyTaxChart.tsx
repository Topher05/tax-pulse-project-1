import styles from "./QuarterlyTaxChart.module.css";
import type { DashboardChartData } from "./dashboardChartData.ts";

interface QuarterlyTaxChartProps {
  estimates: DashboardChartData["quarterlyEstimates"];
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function QuarterlyTaxChart({ estimates }: QuarterlyTaxChartProps) {
  const largestEstimate = Math.max(...estimates.map((estimate) => estimate.amount), 1);

  return (
    <div
      className={styles.chart}
      role="img"
      aria-label="Estimated tax by quarter"
    >
      <ol className={styles.bars}>
        {estimates.map((estimate) => {
          const barHeight = (estimate.amount / largestEstimate) * 100;
          const formattedAmount = currencyFormatter.format(estimate.amount);

          return (
            <li className={styles.barGroup} key={estimate.quarter}>
              <span className={styles.amount}>{formattedAmount}</span>
              <div className={styles.track} aria-hidden="true">
                <div className={styles.bar} style={{ height: `${barHeight}%` }} />
              </div>
              <span className={styles.quarter}>{estimate.quarter}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
