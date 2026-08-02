import { CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";

import styles from "./QuarterlyPaymentsPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { WithholdingProgressChart } from "../../components/WithholdingProgressChart.tsx";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import {
  QuarterlyTimelineItem,
  type QuarterlyEstimateRecord,
} from "../../components/QuarterlyTimelineItem.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { useQuarterlyEstimatesQuery } from "../../entities/quarterlyEstimateQueries.ts";
import { usePlanToolCase, useSetPlanToolCaseId } from "../../shared/usePlanToolCase.ts";

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
      taxYear: "2026",
      dueDate: "2026-04-15",
      estimatedPayment: 3620,
      withholdingApplied: 2140,
      status: "Paid",
    },
    {
      id: "QP-002",
      taxYear: "2026",
      dueDate: "2026-06-15",
      estimatedPayment: 3620,
      withholdingApplied: 3620,
      status: "Paid",
    },
    {
      id: "QP-003",
      taxYear: "2026",
      dueDate: "2026-09-15",
      estimatedPayment: 3620,
      withholdingApplied: 1820,
      status: "Due Soon",
    },
    {
      id: "QP-004",
      taxYear: "2027",
      dueDate: "2027-01-15",
      estimatedPayment: 3740,
      withholdingApplied: 1640,
      status: "Upcoming",
    },
    {
      id: "QP-005",
      taxYear: "2027",
      dueDate: "2027-04-15",
      estimatedPayment: 3740,
      withholdingApplied: 1680,
      status: "Projected",
    },
    {
      id: "QP-006",
      taxYear: "2027",
      dueDate: "2027-06-15",
      estimatedPayment: 3740,
      withholdingApplied: 1740,
      status: "Projected",
    },
    {
      id: "QP-007",
      taxYear: "2027",
      dueDate: "2027-09-15",
      estimatedPayment: 3860,
      withholdingApplied: 1790,
      status: "Projected",
    },
  ] as const;
}

function toQuarterlyEstimateRecord(
  record: {
    case_id: string;
    tax_year: string;
    quarter: "Q1" | "Q2" | "Q3" | "Q4";
    due_date: string;
    estimated_payment: number;
    withholding_applied: number;
    covered_amount: number;
    remaining_due: number;
    status?: "Paid" | "Due Soon" | "Upcoming" | "Projected";
  },
): QuarterlyEstimateRecord {
  const status =
    record.status ??
    (record.remaining_due <= 0
      ? "Paid"
      : record.remaining_due <= 1500
        ? "Due Soon"
        : record.quarter === "Q4"
          ? "Upcoming"
          : "Projected");

  return {
    id: `${record.case_id}-${record.quarter}`,
    taxYear: record.tax_year,
    dueDate: record.due_date,
    estimatedPayment: record.estimated_payment,
    withholdingApplied: record.withholding_applied,
    status,
  };
}

function QuarterlyPaymentsDetachedState() {
  return (
    <PanelCard title="Select a Case">
      <p>Choose a case from the plan-tool selector to load quarterly estimates.</p>
    </PanelCard>
  );
}

export function QuarterlyPaymentsScreen({
  quarterlyEstimates,
}: QuarterlyPaymentsScreenProps) {
  const totalEstimated = quarterlyEstimates.reduce((sum, payment) => sum + payment.estimatedPayment, 0);
  const totalWithholding = quarterlyEstimates.reduce((sum, payment) => sum + payment.withholdingApplied, 0);
  const totalRemaining = totalEstimated - totalWithholding;

  return (
    <div className={styles.page}>
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
        <WithholdingProgressChart
          totalEstimated={totalEstimated}
          totalWithholding={totalWithholding}
          totalRemaining={totalRemaining}
        />
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
  const { caseId, hasInvalidCaseId } = usePlanToolCase();
  const setCaseId = useSetPlanToolCaseId();
  const quarterlyEstimatesQuery = useQuarterlyEstimatesQuery(caseId);
  const contextControl = <CurrentCaseSelector caseId={caseId} onCaseIdChange={setCaseId} />;

  const header = (
    <ToolHeader
      title="Quarterly Payments"
      description={`Read-only quarterly breakdown for tax year ${quarterlyEstimatesQuery.data?.[0]?.tax_year ?? "2026"} - IRS 1040-ES deadlines and estimated amounts. Recording payments is out of MVP scope.`}
      contextControl={contextControl}
    />
  );

  if (hasInvalidCaseId) {
    return (
      <div className={styles.page}>
        {header}
        <PlanToolCaseGate hasInvalidCaseId={true} toolName="Quarterly Payments" />
      </div>
    );
  }

  if (caseId === null) {
    return (
      <div className={styles.page}>
        {header}
        <PlanToolCaseGate hasInvalidCaseId={false} toolName="Quarterly Payments" />
      </div>
    );
  }

  if (quarterlyEstimatesQuery.isLoading) {
    return (
      <div className={styles.page}>
        {header}
        <PanelCard title="Loading quarterly estimates">
          <p>Fetching live quarterly estimate data for the selected case.</p>
        </PanelCard>
      </div>
    );
  }

  if (quarterlyEstimatesQuery.isError) {
    return (
      <div className={styles.page}>
        {header}
        <PanelCard title="Unable to load quarterly estimates">
          <p>{quarterlyEstimatesQuery.error instanceof Error ? quarterlyEstimatesQuery.error.message : "Unknown quarterly estimate error."}</p>
        </PanelCard>
      </div>
    );
  }

  const quarterlyEstimates = quarterlyEstimatesQuery.data?.map(toQuarterlyEstimateRecord) ?? buildPlaceholderQuarterlyEstimates();

  return (
    <div className={styles.page}>
      {header}
      <QuarterlyPaymentsScreen quarterlyEstimates={quarterlyEstimates} />
    </div>
  );
}
