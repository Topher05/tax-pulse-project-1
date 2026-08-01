import styles from "./WithholdingProgressChart.module.css";

interface WithholdingProgressChartProps {
  totalEstimated: number;
  totalWithholding: number;
  totalRemaining: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WithholdingProgressChart({
  totalEstimated,
  totalWithholding,
  totalRemaining,
}: WithholdingProgressChartProps) {
  const coverage = totalEstimated > 0 ? Math.min((totalWithholding / totalEstimated) * 100, 100) : 0;

  return (
    <div className={styles.chart} aria-label="Withholding coverage summary">
      <div className={styles.summaryRow}>
        <div>
          <p className={styles.kicker}>Coverage</p>
          <p className={styles.value}>{coverage.toFixed(0)}%</p>
        </div>
        <div className={styles.barShell} aria-hidden="true">
          <div className={styles.barFill} style={{ width: `${coverage}%` }} />
        </div>
      </div>

      <dl className={styles.metaGrid}>
        <div>
          <dt>Total Estimated</dt>
          <dd>{formatCurrency(totalEstimated)}</dd>
        </div>
        <div>
          <dt>Paid So Far</dt>
          <dd>{formatCurrency(totalWithholding)}</dd>
        </div>
        <div>
          <dt>Remaining Due</dt>
          <dd>{formatCurrency(totalRemaining)}</dd>
        </div>
      </dl>
    </div>
  );
}
