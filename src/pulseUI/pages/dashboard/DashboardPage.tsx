import { ArrowRight, CalendarDays, ChartColumnBig, FolderKanban, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

import styles from "./DashboardPage.module.css";
import { MetricCard } from "../../components/MetricCard.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { WorkflowStepper } from "../../components/WorkflowStepper.tsx";
import { IncomeBreakdownChart } from "./IncomeBreakdownChart.tsx";
import { QuarterlyTaxChart } from "./QuarterlyTaxChart.tsx";
import { YearOverYearTaxChart } from "./YearOverYearTaxChart.tsx";
import {
  defaultDashboardChartData,
  type DashboardChartData,
} from "./dashboardChartData.ts";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const queuePreview = [
  { label: "North Shore Family Office · Q2 2026 Tax Plan", client: "North Shore Family Office", stage: "Review", owner: "Maya Reed", priority: "High", due: "May 12, 2026" },
  { label: "Harbor Point Advisors · Q2 2026 Tax Plan", client: "Harbor Point Advisors", stage: "Modeling", owner: "Jordan Kim", priority: "Medium", due: "Jun 03, 2026" },
  { label: "Summit View Partners · Q2 2026 Tax Plan", client: "Summit View Partners", stage: "Executed", owner: "Noah Patel", priority: "Low", due: "Jun 09, 2026" },
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

export interface DashboardPageProps {
  /**
   * The latest calculation snapshot for the dashboard charts. Chart components added
   * in this ticket consume this value directly, so a new snapshot re-renders them.
   */
  chartData?: DashboardChartData;
}

export function DashboardPage({ chartData }: DashboardPageProps = {}) {
  const dashboardChartData = chartData ?? defaultDashboardChartData;
  const { kpis, taxBreakdown } = dashboardChartData;
  const taxTotal = taxBreakdown.federalTax + taxBreakdown.stateTax;
  const dashboardMetrics = [
    {
      label: "Estimated Total Tax",
      // The KPI is explicitly labelled as the combined federal and state tax, so keep
      // it tied to the figures displayed in the Tax Breakdown panel.
      value: currencyFormatter.format(taxTotal),
      caption: "Federal + state combined",
      tone: "indigo" as const,
      icon: <ChartColumnBig aria-hidden="true" />,
    },
    {
      label: "Effective Rate",
      value: percentFormatter.format(kpis.effectiveRate / 100),
      caption: "Estimated tax as income share",
      tone: "cyan" as const,
      icon: <Sparkles aria-hidden="true" />,
    },
    {
      label: "YTD Gross Income",
      value: currencyFormatter.format(kpis.ytdGrossIncome),
      caption: "Income recorded this tax year",
      tone: "green" as const,
      icon: <FolderKanban aria-hidden="true" />,
    },
    {
      label: "Outstanding Payments",
      value: currencyFormatter.format(kpis.outstandingPayments),
      caption: "Remaining estimated payments",
      tone: "amber" as const,
      icon: <CalendarDays aria-hidden="true" />,
    },
  ];
  const breakdown: Array<{
    label: string;
    amount: string;
    share: number;
    tone: "indigo" | "cyan" | "amber";
    subtractive?: boolean;
  }> = [
    {
      label: "Federal Income Tax",
      amount: currencyFormatter.format(taxBreakdown.federalTax),
      share: taxTotal > 0 ? (taxBreakdown.federalTax / taxTotal) * 100 : 0,
      tone: "indigo" as const,
    },
    {
      label: "State Income Tax",
      amount: currencyFormatter.format(taxBreakdown.stateTax),
      share: taxTotal > 0 ? (taxBreakdown.stateTax / taxTotal) * 100 : 0,
      tone: "cyan" as const,
    },
    {
      label: "Effective Rate",
      amount: percentFormatter.format(taxBreakdown.effectiveRate / 100),
      share: taxBreakdown.effectiveRate,
      tone: "amber" as const,
    },
  ];

  return (
    <div className={styles.page} data-calculation-id={dashboardChartData.calculationId}>
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

      <div className={styles.chartGrid}>
        <PanelCard
          title="Estimated Tax by Quarter"
          description="Projected estimated tax payments for the current calculation."
        >
          <QuarterlyTaxChart estimates={dashboardChartData.quarterlyEstimates} />
        </PanelCard>
        <PanelCard
          title="Income Breakdown"
          description="Income grouped by source for the current calculation."
        >
          <IncomeBreakdownChart incomeBySource={dashboardChartData.incomeBySource} />
        </PanelCard>
      </div>

      <div className={styles.contentGrid}>
        <PanelCard
          title="Tax Breakdown"
          description="Federal, state, and effective-rate figures for the current plan."
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

        <PanelCard
          title="Year-over-Year"
          description="Estimated total tax compared with the prior tax year."
        >
          <YearOverYearTaxChart comparison={dashboardChartData.yearOverYearTax} />
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
                  <th>Tax Plan</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {queuePreview.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
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
