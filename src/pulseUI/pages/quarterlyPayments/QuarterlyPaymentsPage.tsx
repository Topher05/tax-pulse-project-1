import { CalendarClock, CircleCheckBig, HandCoins, RefreshCw, ShieldAlert } from "lucide-react";

import styles from "./QuarterlyPaymentsPage.module.css";
import { EmptyState } from "../../components/EmptyState.tsx";
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
    status: record.status,
  };
}

function QuarterlyPaymentsLoadingState() {
  const skeletonRows = Array.from({ length: 4 }, (_, index) => index);

  return (
    <PanelCard
      title="Loading quarterly estimates"
      description="Fetching the selected case's quarterly estimate schedule."
    >
      <div
        className={styles.skeletonTimeline}
        role="status"
        aria-label="Loading quarterly estimates"
      >
        <span className="srOnly">Loading quarterly estimates</span>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={styles.skeletonDate} />
            <span className={styles.skeletonContent}>
              <span className={styles.skeletonBlock} />
              <span className={styles.skeletonBlock} />
            </span>
            <span className={styles.skeletonAmount} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function QuarterlyPaymentsEmptyState() {
  return (
    <EmptyState
      title="No quarterly estimates yet"
      description="This case has no quarterly estimates for the selected period."
      icon={<CalendarClock />}
    />
  );
}

function QuarterlyPaymentsErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="Quarterly estimates could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
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
  const quarterlyEstimatesQueryState = quarterlyEstimatesQuery.isLoading
    ? "loading"
    : quarterlyEstimatesQuery.isError
      ? "error"
      : quarterlyEstimatesQuery.data?.length === 0
        ? "empty"
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

  const quarterlyEstimates = quarterlyEstimatesQuery.data?.map(toQuarterlyEstimateRecord) ?? [];

  return (
    <div className={styles.page} data-quarterly-query-state={quarterlyEstimatesQueryState}>
      {header}
      {quarterlyEstimatesQueryState === "loading" ? <QuarterlyPaymentsLoadingState /> : null}
      {quarterlyEstimatesQueryState === "empty" ? <QuarterlyPaymentsEmptyState /> : null}
      {quarterlyEstimatesQueryState === "error" ? (
        <QuarterlyPaymentsErrorState
          message={
            quarterlyEstimatesQuery.error instanceof Error
              ? quarterlyEstimatesQuery.error.message
              : "Quarterly estimates request failed."
          }
          onRetry={() => {
            void quarterlyEstimatesQuery.refetch();
          }}
        />
      ) : null}
      {quarterlyEstimatesQueryState === "data" ? (
        <QuarterlyPaymentsScreen quarterlyEstimates={quarterlyEstimates} />
      ) : null}
    </div>
  );
}
