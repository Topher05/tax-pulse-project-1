import { useNavigate } from "@tanstack/react-router";

import type { PlanCycleQueueMetric, PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";

const queueMetrics: readonly PlanCycleQueueMetric[] = [
  {
    label: "Open Cycles",
    value: "5",
    caption: "7 due this week",
  },
  {
    label: "Awaiting Review",
    value: "2",
    caption: "Awaiting Firm Admin Approval",
  },
  {
    label: "Overdue",
    value: "1",
    caption: "Needs attention today",
  },
  {
    label: "Presented This Week",
    value: "4",
    caption: "Avg Cycle: 4 days",
  },
] as const;

const queueRows: readonly PlanCycleQueueRow[] = [
  {
    caseId: "TP-24018",
    client: "North Shore Family Office",
    stage: "Modeling",
    owner: "Maya Reed",
    priority: "High",
    dueDate: "Overdue",
    updatedDate: "May 12, 2026",
    overdue: true,
  },
  {
    caseId: "TP-24021",
    client: "Harbor Point Advisors",
    stage: "Awaiting Review",
    owner: "Jordan Kim",
    priority: "Medium",
    dueDate: "Jun 03, 2026",
    updatedDate: "May 29, 2026",
    overdue: false,
  },
  {
    caseId: "TP-24027",
    client: "Cedar Ridge Wealth",
    stage: "Modeling",
    owner: "Avery Chen",
    priority: "Low",
    dueDate: "Jun 06, 2026",
    updatedDate: "May 31, 2026",
    overdue: false,
  },
  {
    caseId: "TP-24033",
    client: "Summit View Partners",
    stage: "Presented",
    owner: "Noah Patel",
    priority: "High",
    dueDate: "Jun 09, 2026",
    updatedDate: "Jun 01, 2026",
    overdue: false,
  },
  {
    caseId: "TP-24038",
    client: "Beacon Street Group",
    stage: "Awaiting Review",
    owner: "Isla Torres",
    priority: "Medium",
    dueDate: "Jun 12, 2026",
    updatedDate: "Jun 04, 2026",
    overdue: false,
  },
] as const;

export function Queue() {
  const navigate = useNavigate();

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
              {queueRows.map((row) => (
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
