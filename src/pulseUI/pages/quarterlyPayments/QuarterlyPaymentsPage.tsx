import { CircleCheckBig, HandCoins, ShieldAlert } from "lucide-react";

import styles from "./QuarterlyPaymentsPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { WithholdingProgressChart } from "../../components/WithholdingProgressChart.tsx";
import { CurrentCaseSelector } from "../../components/CurrentCaseSelector.tsx";
import { PlanToolCaseGate } from "../../components/PlanToolCaseGate.tsx";
import {
  QuarterlyTimelineItem,
  type QuarterlyEstimateQuarter,
  type QuarterlyEstimateRecord,
} from "../../components/QuarterlyTimelineItem.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { useQuarterlyEstimatesQuery } from "../../entities/quarterlyEstimateQueries.ts";
import { usePlanToolCase, useSetPlanToolCaseId } from "../../shared/usePlanToolCase.ts";

export type { QuarterlyEstimateRecord, QuarterlyEstimateStatus } from "../../components/QuarterlyTimelineItem.tsx";

export interface QuarterlyPaymentsScreenProps {
  quarterlyEstimates: readonly QuarterlyEstimateRecord[];
}

const quarterOrder: Record<QuarterlyEstimateQuarter, number> = {
  Q1: 1,
  Q2: 2,
  Q3: 3,
  Q4: 4,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toQuarterlyEstimateRecord(
  record: {
    case_id: string;
    tax_year: string;
    quarter: QuarterlyEstimateQuarter;
    due_date: string;
    estimated_payment: number;
    withholding_applied: number;
    covered_amount: number;
    remaining_due: number;
    status: "Paid" | "Due";
  },
): QuarterlyEstimateRecord {
  return {
    id: `${record.case_id}-${record.quarter}`,
    taxYear: record.tax_year,
    quarter: record.quarter,
    dueDate: record.due_date,
    estimatedPayment: record.estimated_payment,
    withholdingApplied: record.withholding_applied,
    coveredAmount: record.covered_amount,
    remainingDue: record.remaining_due,
    status: record.status,
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
  const totalCovered = quarterlyEstimates.reduce((sum, payment) => sum + payment.coveredAmount, 0);
  const totalWithholding = quarterlyEstimates.reduce((sum, payment) => sum + payment.withholdingApplied, 0);
  const totalRemaining = quarterlyEstimates.reduce((sum, payment) => sum + payment.remainingDue, 0);

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
          value={formatCurrency(totalCovered)}
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
        />
      </PanelCard>

      <div className={styles.contentGrid}>
        <PanelCard
          title="Timeline"
          description="Federal estimation checkpoints"
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
  // Jira-119 owns the visible loading/error/data UI wiring; this ticket only tracks the states.
  const quarterlyEstimatesQueryState = quarterlyEstimatesQuery.isLoading
    ? "loading"
    : quarterlyEstimatesQuery.isError
      ? "error"
      : "data";

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

  const quarterlyEstimates = quarterlyEstimatesQuery.data
    ?.map(toQuarterlyEstimateRecord)
    .sort((left, right) => quarterOrder[left.quarter] - quarterOrder[right.quarter]) ?? [];

  return (
    <div className={styles.page} data-quarterly-query-state={quarterlyEstimatesQueryState}>
      {header}
      <QuarterlyPaymentsScreen quarterlyEstimates={quarterlyEstimates} />
    </div>
  );
}
