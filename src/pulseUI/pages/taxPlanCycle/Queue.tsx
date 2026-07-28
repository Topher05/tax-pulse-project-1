import { useNavigate } from "@tanstack/react-router";

import type { PlanCycleQueueMetric, PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";

interface QueueProps {
  rows: readonly PlanCycleQueueRow[];
}

function buildQueueMetrics(rows: readonly PlanCycleQueueRow[]): readonly PlanCycleQueueMetric[] {
  const awaitingReviewCount = rows.filter(
    (row) => row.stage === "Review" || row.stage === "Awaiting Review",
  ).length;
  const overdueCount = rows.filter((row) => row.overdue).length;
  const presentedThisWeekCount = rows.filter(
    (row) => row.stage === "Executed" || row.stage === "Presented",
  ).length;

  return [
    {
      label: "Open Cycles",
      value: String(rows.length),
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
  const queueMetrics = buildQueueMetrics(rows);

  return (
    <div className="queuePage">
      <header className="queueHero">
        <div className="queueHeroCopy">
          <p className="queueEyebrow">Tax Plan Cycle</p>
          <h2 className="queueTitle">Tax Plan Cycle Queue</h2>
          <p className="queueLead">Track open cycles, review ownership, and timing at a glance.</p>
        </div>

        <button className="queueHeroAction" type="button">
          New Cycle
        </button>
      </header>

      <section aria-label="Queue KPIs" className="queueKpiGrid">
        {queueMetrics.map((metric) => (
          <article className="queueKpiCard" key={metric.label}>
            <p className="queueKpiLabel">{metric.label}</p>
            <p className="queueKpiValue">{metric.value}</p>
            <p className="queueKpiCaption">{metric.caption}</p>
          </article>
        ))}
      </section>

      <section className="queueTableCard">
        <div className="queueSectionHeader">
          <div>
            <h3 className="queueSectionTitle">Tax Plan Cycle Cases</h3>
            <p className="queueSectionCopy">
              Five open cases are ready for review, modeling, or presentation.
            </p>
          </div>

          <button className="queueSectionAction" type="button">
            New Cycle
          </button>
        </div>

        <div className="queueTableWrap">
          <table className="queueTable" aria-label="Tax Plan Cycle Cases">
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
                <tr key={row.caseId}>
                  <td className="queueCaseId">{row.caseId}</td>
                  <td>{row.client}</td>
                  <td>{row.stage}</td>
                  <td>{row.owner}</td>
                  <td>
                    <span className="queueRowPriority">{row.priority}</span>
                  </td>
                  <td>
                    {row.overdue ? (
                      <span className="queueBadge queueBadgeOverdue">Overdue</span>
                    ) : (
                      <span>{row.dueDate}</span>
                    )}
                  </td>
                  <td>{row.updatedDate}</td>
                  <td>
                    <button
                      className="queueRowAction"
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
