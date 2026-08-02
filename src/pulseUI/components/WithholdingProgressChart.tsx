import styles from "./WithholdingProgressChart.module.css";

interface WithholdingProgressChartProps {
  totalEstimated: number;
  totalWithholding: number;
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
}: WithholdingProgressChartProps) {
  const coverage = totalEstimated > 0 ? Math.min((totalWithholding / totalEstimated) * 100, 100) : 0;
  const totalRemaining = Math.max(totalEstimated - totalWithholding, 0);

  return (
    <div className={`${styles.chart} grid gap-3`} aria-label="Withholding coverage summary">
      <div className={`${styles.summaryRow} flex items-center gap-2`}>
        <p className={`${styles.value} m-0 text-xs font-extrabold tabular-nums text-[var(--pulse-foreground)]`}>
          {coverage.toFixed(1)}%
        </p>
        <div
          className={`${styles.barShell} h-2 min-w-0 flex-1 overflow-hidden rounded-[8px] border border-[var(--pulse-border-strong)] bg-white/5`}
          aria-hidden="true"
        >
          <div
            className={`${styles.barFill} h-full rounded-[6px] bg-gradient-to-r from-emerald-500 to-sky-400`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <p className={`${styles.metaLine} m-0 text-sm text-[var(--pulse-muted)]`}>
        Paid so far of estimated tax covered by withholdings: {formatCurrency(totalWithholding)} of{" "}
        {formatCurrency(totalEstimated)}. Remaining due: {formatCurrency(totalRemaining)}.
      </p>
    </div>
  );
}
