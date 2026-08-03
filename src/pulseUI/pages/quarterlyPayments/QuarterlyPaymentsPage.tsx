import { CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";

import styles from "./QuarterlyPaymentsPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import {
  QuarterlyTimelineItem,
  type QuarterlyEstimateRecord,
} from "../../components/QuarterlyTimelineItem.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export type { QuarterlyEstimateRecord, QuarterlyEstimateStatus } from "../../components/QuarterlyTimelineItem.tsx";

export interface QuarterlyPaymentsScreenProps {
  quarterlyEstimates: readonly QuarterlyEstimateRecord[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPlaceholderQuarterlyEstimates(): readonly QuarterlyEstimateRecord[] {
  return [
    {
      id: "QP-001",
      dueDate: "2026-04-15",
      estimatedPayment: 3620,
      withholdingApplied: 2140,
      status: "Paid",
    },
    {
      id: "QP-002",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 2060,
      status: "Paid",
    },
    {
      id: "QP-003",
      dueDate: "2026-09-15",
      estimatedPayment: 3620,
      withholdingApplied: 1820,
      status: "Due Soon",
    },
    {
      id: "QP-004",
      dueDate: "2027-01-15",
      estimatedPayment: 3740,
      withholdingApplied: 1640,
      status: "Upcoming",
    },
    {
      id: "QP-005",
      dueDate: "2027-04-15",
      estimatedPayment: 3740,
      withholdingApplied: 1680,
      status: "Projected",
    },
    {
      id: "QP-006",
      dueDate: "2027-06-15",
      estimatedPayment: 3740,
      withholdingApplied: 1740,
      status: "Projected",
    },
    {
      id: "QP-007",
      dueDate: "2027-09-15",
      estimatedPayment: 3860,
      withholdingApplied: 1790,
      status: "Projected",
    },
  ] as const;
}

export function QuarterlyPaymentsScreen({
  quarterlyEstimates,
}: QuarterlyPaymentsScreenProps) {
  const totalEstimated = quarterlyEstimates.reduce((sum, payment) => sum + payment.estimatedPayment, 0);
  const totalWithholding = quarterlyEstimates.reduce((sum, payment) => sum + payment.withholdingApplied, 0);
  const totalRemaining = totalEstimated - totalWithholding;

  return (
    <div className={styles.page}>
      <ToolHeader
        title="Quarterly Payments"
        description="Read-only quarterly breakdown - IRS 1040-ES deadlines and estimated amounts. Recording payments is out of MVP scope."
      />

      <section className={styles.metricGrid} aria-label="Quarterly payments KPI region">
        <MetricCard
          label="Total Estimated"
          value={formatCurrency(totalEstimated)}
          caption=""
          tone="indigo"
          icon={<HandCoins aria-hidden="true" />}
        />
        <MetricCard
          label="Paid So Far"
          value={formatCurrency(totalWithholding)}
          caption=""
          tone="green"
          icon={<CircleCheckBig aria-hidden="true" />}
          valueClassName={styles.greenValue}
        />
        <MetricCard
          label="Remaining Due"
          value={formatCurrency(totalRemaining)}
          caption=""
          tone="amber"
          icon={<ShieldAlert aria-hidden="true" />}
          valueClassName={styles.amberValue}
        />
      </section>

      <PanelCard title="Withholding Progress" className={styles.fullWidthCard}>
        <div className={styles.tbdCard}>
          <span className={styles.tbdLabel}>TBD</span>
          <p className={styles.tbdCopy}>Placeholder only for the withholding progress visualization.</p>
        </div>
      </PanelCard>

      <div className={styles.contentGrid}>
        <PanelCard
          title="Quarter Timeline"
          description="Seven synthetic estimate checkpoints for the planning horizon."
        >
          <ul className={styles.timelineList} aria-label="Quarter timeline">
            {quarterlyEstimates.map((payment) => (
              <QuarterlyTimelineItem key={payment.id} estimate={payment} />
            ))}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}

export function QuarterlyPaymentsPage() {
  const quarterlyEstimates = buildPlaceholderQuarterlyEstimates();

  return (
    <QuarterlyPaymentsScreen
      quarterlyEstimates={quarterlyEstimates}
    />
  );
}
