import { CircleCheckBig, Clock3, ShieldAlert } from "lucide-react";

import styles from "./QuarterlyTimelineItem.module.css";
import { StatusPill } from "./StatusPill.tsx";

export type QuarterlyEstimateStatus = "Paid" | "Due Soon" | "Upcoming" | "Projected";

export interface QuarterlyEstimateRecord {
  id: string;
  taxYear: string;
  dueDate: string;
  estimatedPayment: number;
  withholdingApplied: number;
  status: QuarterlyEstimateStatus;
}

export interface QuarterlyTimelineItemProps {
  estimate: QuarterlyEstimateRecord;
}

const quarterlyEstimateStatusTone: Record<QuarterlyEstimateStatus, "success" | "warning" | "info" | "neutral"> = {
  Paid: "success",
  "Due Soon": "warning",
  Upcoming: "info",
  Projected: "neutral",
};

const quarterlyEstimateStatusIcon: Record<QuarterlyEstimateStatus, typeof CircleCheckBig> = {
  Paid: CircleCheckBig,
  "Due Soon": ShieldAlert,
  Upcoming: Clock3,
  Projected: Clock3,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateValue}T00:00:00Z`));
}

function formatDay(dateValue: string): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${dateValue}T00:00:00Z`));
}

export function QuarterlyTimelineItem({ estimate }: QuarterlyTimelineItemProps) {
  const statusTone = quarterlyEstimateStatusTone[estimate.status];
  const StatusIcon = quarterlyEstimateStatusIcon[estimate.status];

  return (
    <li className={styles.item}>
      <div className={styles.dateSection}>
        <span className={styles.month}>{formatMonth(estimate.dueDate)}</span>
        <span className={styles.day}>{formatDay(estimate.dueDate)}</span>
      </div>

      <div className={styles.dataSection}>
        <span className={styles.statusDot} data-tone={statusTone} aria-hidden="true" />
        <div className={styles.dataCopy}>
          <p className={styles.mainText}>Estimated quarterly payment</p>
          <p className={styles.subText}>
            Withholding applied: {formatCurrency(estimate.withholdingApplied)}
          </p>
        </div>
      </div>

      <div className={styles.transactionDetails}>
        <span className={styles.amount}>{formatCurrency(estimate.estimatedPayment)}</span>
        <StatusPill tone={statusTone}>
          <StatusIcon aria-hidden="true" />
          {estimate.status}
        </StatusPill>
      </div>
    </li>
  );
}
