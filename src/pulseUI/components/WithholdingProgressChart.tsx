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
    <div className={`${styles.chart} grid gap-4`} aria-label="Withholding coverage summary">
      <div className={`${styles.summaryRow} grid items-center gap-4 lg:grid-cols-[160px_minmax(0,1fr)]`}>
        <div className="min-w-0">
          <p className={`${styles.kicker} mb-1 text-xs font-bold uppercase tracking-[0.12em]`}>
            Coverage
          </p>
          <p className={`${styles.value} m-0 text-3xl font-black leading-none text-[var(--pulse-foreground)]`}>
            {coverage.toFixed(0)}%
          </p>
        </div>
        <div className={`${styles.barShell} h-[18px] overflow-hidden rounded-full border border-[var(--pulse-border-strong)] bg-white/5`} aria-hidden="true">
          <div
            className={`${styles.barFill} h-full rounded-[inherit] bg-gradient-to-r from-emerald-500 to-sky-400`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      <dl className={`${styles.metaGrid} grid gap-3 md:grid-cols-3`}>
        <div className="grid gap-1 rounded-[14px] bg-white/5 px-4 py-3">
          <dt>Total Estimated</dt>
          <dd>{formatCurrency(totalEstimated)}</dd>
        </div>
        <div className="grid gap-1 rounded-[14px] bg-white/5 px-4 py-3">
          <dt>Paid So Far</dt>
          <dd>{formatCurrency(totalWithholding)}</dd>
        </div>
        <div className="grid gap-1 rounded-[14px] bg-white/5 px-4 py-3">
          <dt>Remaining Due</dt>
          <dd>{formatCurrency(totalRemaining)}</dd>
        </div>
      </dl>
    </div>
  );
}
