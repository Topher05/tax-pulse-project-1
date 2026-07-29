import { ArrowRight, CalendarDays, ChartColumnBig, FolderKanban, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import styles from "./DashboardPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { WorkflowStepper } from "../../components/WorkflowStepper.tsx";

const dashboardMetrics = [
  {
    label: "Estimated Total Tax",
    value: "$58,420",
    caption: "Federal + state combined",
    tone: "indigo" as const,
    icon: <ChartColumnBig aria-hidden="true" />,
  },
  {
    label: "Effective Tax Rate",
    value: "22.8%",
    caption: "Marginal: 32.0%",
    tone: "cyan" as const,
    icon: <Sparkles aria-hidden="true" />,
  },
  {
    label: "Outstanding Quarterly",
    value: "$14,620",
    caption: "Two payments remain open",
    tone: "amber" as const,
    icon: <CalendarDays aria-hidden="true" />,
  },
  {
    label: "Open Plan Cycles",
    value: "14",
    caption: "3 due this week",
    tone: "green" as const,
    icon: <FolderKanban aria-hidden="true" />,
  },
];

const breakdown = [
  { label: "Federal Income Tax", amount: "$31,200", share: 56, tone: "indigo" as const },
  { label: "State Tax (CA)", amount: "$10,540", share: 19, tone: "cyan" as const },
  { label: "Self-Employment Tax", amount: "$8,800", share: 16, tone: "amber" as const },
  { label: "Withholdings", amount: "$16,760", share: 30, tone: "green" as const, subtractive: true },
];

const quarterlyPayments = [
  { month: "Q1", date: "Apr 15", amount: "$3,620", subtitle: "Estimated payment", paid: true },
  { month: "Q2", date: "Jun 15", amount: "$3,620", subtitle: "Estimated payment", paid: true },
  { month: "Q3", date: "Sep 15", amount: "$3,620", subtitle: "Due soon", paid: false },
  { month: "Q4", date: "Jan 15", amount: "$3,760", subtitle: "Upcoming", paid: false },
];

const queuePreview = [
  { id: "TP-24018", client: "North Shore Family Office", stage: "Review", owner: "Maya Reed", priority: "High", due: "May 12, 2026" },
  { id: "TP-24021", client: "Harbor Point Advisors", stage: "Modeling", owner: "Jordan Kim", priority: "Medium", due: "Jun 03, 2026" },
  { id: "TP-24033", client: "Summit View Partners", stage: "Executed", owner: "Noah Patel", priority: "Low", due: "Jun 09, 2026" },
] as const;

const scenarioSummary = [
  {
    name: "Increase retirement contributions",
    desc: "Boost 401(k) deferrals by $6k and re-run withholding assumptions.",
    impact: "-$4,500 tax",
  },
  {
    name: "Keep baseline",
    desc: "Hold current assumptions and preserve the current cashflow profile.",
    impact: "$0 change",
  },
];

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <PanelCard
        className={styles.hero}
        title="Tax Liability Tracker"
        description="Monitor open cases, review estimates, and move quickly from planning to client-ready recommendations."
        action={
          <Link className={styles.primaryAction} to="/cycles/queue">
            Open Queue
            <ArrowRight aria-hidden="true" />
          </Link>
        }
      >
        <div className={styles.heroMeta}>
          <StatusPill tone="success">Live calculation</StatusPill>
          <span className={styles.heroMetaText}>Tax year 2026 · Firm Admin view</span>
        </div>
      </PanelCard>

      <section className={styles.metricGrid} aria-label="Dashboard metrics">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <div className={styles.contentGrid}>
        <PanelCard
          title="Tax Breakdown"
          description="Federal, state, and estimated payment coverage for the current plan."
        >
          <div className={styles.breakdownList}>
            {breakdown.map((item) => (
              <div className={styles.breakdownItem} key={item.label}>
                <div className={styles.breakdownHead}>
                  <span className={styles.breakdownLabel}>{item.label}</span>
                  <span className={styles.breakdownAmount}>
                    {item.subtractive ? "−" : ""}
                    {item.amount}
                  </span>
                </div>
                <div className={styles.progressBar} aria-hidden="true">
                  <div
                    className={[styles.progressFill, styles[`tone${item.tone}`]].join(" ")}
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Quarterly Payments" description="Current estimated schedule and coverage status.">
          <div className={styles.timeline}>
            {quarterlyPayments.map((payment) => (
              <article className={styles.timelineItem} key={payment.month}>
                <div className={styles.timelineDate}>
                  <span className={styles.timelineMonth}>{payment.month}</span>
                  <span className={styles.timelineDay}>{payment.date}</span>
                </div>
                <div className={styles.timelineInfo}>
                  <div className={styles.timelineLabel}>{payment.subtitle}</div>
                  <div className={styles.timelineDesc}>Estimated quarterly payment</div>
                </div>
                <div className={styles.timelineAmount}>
                  <span className={styles.timelineValue}>{payment.amount}</span>
                  <StatusPill tone={payment.paid ? "success" : "warning"}>
                    {payment.paid ? "Paid" : "Open"}
                  </StatusPill>
                </div>
              </article>
            ))}
          </div>
        </PanelCard>
      </div>

      <div className={styles.bottomGrid}>
        <PanelCard
          title="Plan Cycle Queue"
          description="The most active cases in the queue, ordered by need and due date."
          action={
            <Link className={styles.textAction} to="/cycles/queue">
              View all
            </Link>
          }
        >
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label="Queue preview">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {queuePreview.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.client}</td>
                    <td>{row.stage}</td>
                    <td>{row.owner}</td>
                    <td>
                      <StatusPill tone={row.priority === "High" ? "danger" : row.priority === "Medium" ? "warning" : "info"}>
                        {row.priority}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>

        <PanelCard
          title="Scenario Snapshot"
          description="Example what-if scenarios that mirror the planner workflow."
        >
          <div className={styles.scenarioList}>
            {scenarioSummary.map((scenario) => (
              <article className={styles.scenarioCard} key={scenario.name}>
                <div className={styles.scenarioHeader}>
                  <h3 className={styles.scenarioName}>{scenario.name}</h3>
                  <StatusPill tone={scenario.impact.startsWith("-") ? "success" : "neutral"}>
                    {scenario.impact}
                  </StatusPill>
                </div>
                <p className={styles.scenarioDesc}>{scenario.desc}</p>
              </article>
            ))}
          </div>

          <div className={styles.stepperBlock}>
            <WorkflowStepper
              stages={[
                "Intake",
                "Data Aggregation",
                "Modeling",
                "Review",
                "Client Approval",
                "Executed",
              ]}
              activeStage="Review"
            />
          </div>
        </PanelCard>
      </div>
    </div>
  );
}
