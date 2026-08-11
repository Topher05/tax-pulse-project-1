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
  const coverage = totalEstimated > 0
    ? Math.min(Math.max((totalWithholding / totalEstimated) * 100, 0), 100)
    : 0;

  return (
    <div className={`${styles.chart} grid gap-3`} aria-label="Withholding coverage summary">
      <div className={`${styles.summaryRow} flex items-center gap-2`}>
        <p className={`${styles.value} m-0 text-xs font-extrabold tabular-nums text-[var(--pulse-foreground)]`}>
          {coverage.toFixed(1)}%
        </p>
        <div
          className={`${styles.barShell} h-2 min-w-0 flex-1 overflow-hidden rounded-[8px] border border-[var(--pulse-border-strong)] bg-white/5`}
          role="progressbar"
          aria-label="Estimated tax covered by withholding"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Number(coverage.toFixed(1))}
        >
          <div
            className={`${styles.barFill} h-full rounded-[6px] bg-gradient-to-r from-emerald-500 to-sky-400`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <p className={`${styles.metaLine} m-0 text-sm text-[var(--pulse-muted)]`}>
        {formatCurrency(totalWithholding)} of{" "} {formatCurrency(totalEstimated)} estimated tax covered by withholdings.
      </p>
    </div>
  );
}
