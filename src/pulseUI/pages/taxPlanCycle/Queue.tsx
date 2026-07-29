import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, CircleDot, Clock3, Layers3 } from "lucide-react";

import styles from "./Queue.module.css";
import type { PlanCycleQueueMetric, PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";

interface QueueProps {
  rows: readonly PlanCycleQueueRow[];
}

export interface QueueMetricCounts {
  awaitingReviewCount: number;
  overdueCount: number;
  presentedThisWeekCount: number;
}

export function computeMetric(rows: readonly PlanCycleQueueRow[]): QueueMetricCounts {
  return {
    awaitingReviewCount: rows.filter(
      (row) => row.stage === "Review" || row.stage === "Awaiting Review",
    ).length,
    overdueCount: rows.filter((row) => row.overdue).length,
    presentedThisWeekCount: rows.filter(
      (row) => row.stage === "Executed" || row.stage === "Presented",
    ).length,
  };
}

export function buildQueueMetrics(
  counts: QueueMetricCounts,
  rowCount: number,
): readonly PlanCycleQueueMetric[] {
  const { awaitingReviewCount, overdueCount, presentedThisWeekCount } = counts;

  return [
    {
      label: "Open Cycles",
      value: String(rowCount),
      caption: "7 due this week",
    },
    {
      label: "Awaiting Review",
      value: String(awaitingReviewCount),
      caption: "Awaiting Firm Admin Approval",
    },
    {
      label: "Overdue",
      value: String(overdueCount),
      caption: "Needs attention today",
    },
    {
      label: "Presented This Week",
      value: String(presentedThisWeekCount),
      caption: "Avg Cycle: 4 days",
    },
  ] as const;
}

function getPriorityTone(priority: string): "danger" | "warning" | "info" {
  const normalized = priority.toLowerCase();

  if (normalized === "high") {
    return "danger";
  }

  if (normalized === "medium") {
    return "warning";
  }

  return "info";
}

export function Queue({ rows }: QueueProps) {
  const navigate = useNavigate();
  const queueMetrics = buildQueueMetrics(computeMetric(rows), rows.length);
  const metricTones = ["indigo", "cyan", "amber", "green"] as const;
  const metricIcons = [CircleDot, Layers3, Clock3, ArrowUpRight] as const;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Tax Plan Cycle</p>
          <h2 className={styles.title}>Tax Plan Cycle Queue</h2>
          <p className={styles.lead}>
            Track open cycles, review ownership, and timing at a glance.
          </p>
        </div>

        <button className={styles.primaryAction} type="button">
          New Cycle
        </button>
      </section>

      <section aria-label="Queue KPIs" className={styles.metricGrid}>
        {queueMetrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? CircleDot;

          return (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              caption={metric.caption}
              tone={metricTones[index]}
              icon={<Icon aria-hidden="true" />}
            />
          );
        })}
      </section>

      <PanelCard
        title="Tax Plan Cycle Cases"
        description="Five open cases are ready for review, modeling, or presentation."
        action={
          <button className={styles.secondaryAction} type="button">
            New Cycle
          </button>
        }
      >
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Tax Plan Cycle Cases">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Client</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Updated Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className={styles.row} key={row.caseId}>
                  <td className={styles.tableBodyCell}>
                    <span className={styles.caseId}>{row.caseId}</span>
                  </td>
                  <td className={styles.tableBodyCell}>{row.client}</td>
                  <td className={styles.tableBodyCell}>{row.stage}</td>
                  <td className={styles.tableBodyCell}>{row.owner}</td>
                  <td className={styles.tableBodyCell}>
                    <StatusPill tone={getPriorityTone(row.priority)}>{row.priority}</StatusPill>
                  </td>
                  <td className={styles.tableBodyCell}>
                    {row.overdue ? (
                      <StatusPill tone="danger">Overdue</StatusPill>
                    ) : (
                      <span>{row.dueDate}</span>
                    )}
                  </td>
                  <td className={styles.tableBodyCell}>{row.updatedDate}</td>
                  <td className={styles.tableBodyCell}>
                    <button
                      className={styles.rowAction}
                      type="button"
                      onClick={() => {
                        navigate({
                          to: "/cycles/$id",
                          params: { id: row.caseId },
                        });
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
