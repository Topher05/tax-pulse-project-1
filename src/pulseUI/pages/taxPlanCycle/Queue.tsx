import { useNavigate } from "@tanstack/react-router";

import styles from "./Queue.module.css";

import type { PlanCycleQueueMetric, PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";

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

export function Queue({ rows }: QueueProps) {
  const navigate = useNavigate();
  const queueMetrics = buildQueueMetrics(computeMetric(rows), rows.length);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Tax Plan Cycle</p>
          <h2 className={styles.title}>Tax Plan Cycle Queue</h2>
          <p className={styles.lead}>Track open cycles, review ownership, and timing at a glance.</p>
        </div>

        <button className={styles.primaryAction} type="button">
          New Cycle
        </button>
      </header>

      <section aria-label="Queue KPIs" className={styles.kpiGrid}>
        {queueMetrics.map((metric) => (
          <article className={styles.card} key={metric.label}>
            <p className={styles.kpiLabel}>{metric.label}</p>
            <p className={styles.kpiValue}>{metric.value}</p>
            <p className={styles.kpiCaption}>{metric.caption}</p>
          </article>
        ))}
      </section>

      <section className={styles.tableCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h3 className={styles.sectionTitle}>Tax Plan Cycle Cases</h3>
            <p className={styles.sectionCopy}>
              Five open cases are ready for review, modeling, or presentation.
            </p>
          </div>

          <button className={styles.secondaryAction} type="button">
            New Cycle
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Tax Plan Cycle Cases">
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Case ID</th>
                <th className={styles.tableHeadCell}>Client</th>
                <th className={styles.tableHeadCell}>Stage</th>
                <th className={styles.tableHeadCell}>Owner</th>
                <th className={styles.tableHeadCell}>Priority</th>
                <th className={styles.tableHeadCell}>Due Date</th>
                <th className={styles.tableHeadCell}>Updated Date</th>
                <th className={styles.tableHeadCell}>Action</th>
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
                    <span className={styles.priority}>{row.priority}</span>
                  </td>
                  <td className={styles.tableBodyCell}>
                    {row.overdue ? (
                      <span className={styles.overdue}>Overdue</span>
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
      </section>
    </div>
  );
}
