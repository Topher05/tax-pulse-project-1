import { CalendarDays, Lightbulb, PiggyBank, UserRound } from "lucide-react";

import styles from "./MyTaxPlanPage.module.css";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { WorkflowStepper } from "../../components/WorkflowStepper.tsx";
import { useClientTaxPlanQuery } from "../../entities/clientTaxPlanQueries.ts";
import { caseStages } from "../taxPlanCycle/detailViewState.ts";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMeeting(nextMeeting: string | null): string {
  if (nextMeeting === null) {
    return "Not yet scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(nextMeeting));
}

export function MyTaxPlanPage() {
  const taxPlanQuery = useClientTaxPlanQuery();

  if (taxPlanQuery.isPending) {
    return (
      <PanelCard title="My Tax Plan" description="Loading your current tax plan.">
        <p role="status">Loading your tax plan...</p>
      </PanelCard>
    );
  }

  if (taxPlanQuery.isError) {
    return (
      <PanelCard title="My Tax Plan" description="Your tax plan could not load.">
        <p role="alert">Please try again shortly.</p>
      </PanelCard>
    );
  }

  const taxPlan = taxPlanQuery.data;

  if (!taxPlan) {
    return null;
  }

  return (
    <div className={styles.page}>
      <PanelCard className={styles.hero}>
        <div className={styles.heroContent}>
          <div>
            <p className={styles.eyebrow}>TaxPulse Advisory</p>
            <h2 className={styles.title}>Your 2026 Tax Plan</h2>
            <p className={styles.lead}>
              Follow your plan&apos;s progress and prepare for the next step with your advisor.
            </p>
          </div>
          <StatusPill tone={taxPlan.on_hold ? "warning" : "success"}>
            {taxPlan.on_hold ? "On hold" : "Plan active"}
          </StatusPill>
        </div>

        <div className={styles.stageSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.sectionLabel}>Current stage</p>
            <p className={styles.stageName}>{taxPlan.stage}</p>
          </div>
          <WorkflowStepper stages={caseStages} activeStage={taxPlan.stage} />
        </div>
      </PanelCard>

      <section className={styles.summarySection} aria-labelledby="plan-summary-title">
        <div className={styles.summaryHeading}>
          <p className={styles.eyebrow}>Plan summary</p>
          <h2 id="plan-summary-title">What&apos;s ahead</h2>
        </div>

        <div className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={[styles.summaryIcon, styles.iconCyan].join(" ")} aria-hidden="true">
              <UserRound />
            </span>
            <p className={styles.summaryLabel}>Your advisor</p>
            <p className={styles.summaryValue}>{taxPlan.advisor}</p>
            <p className={styles.summaryCopy}>Your primary planning contact.</p>
          </article>

          <article className={styles.summaryCard}>
            <span className={[styles.summaryIcon, styles.iconAmber].join(" ")} aria-hidden="true">
              <CalendarDays />
            </span>
            <p className={styles.summaryLabel}>Next meeting</p>
            <p className={styles.summaryValue}>{formatMeeting(taxPlan.next_meeting)}</p>
            <p className={styles.summaryCopy}>Scheduled time with your advisor.</p>
          </article>

          <article className={styles.summaryCard}>
            <span className={[styles.summaryIcon, styles.iconGreen].join(" ")} aria-hidden="true">
              <PiggyBank />
            </span>
            <p className={styles.summaryLabel}>Projected savings</p>
            <p className={styles.savingsValue}>
              {taxPlan.projected_savings === null
                ? "In progress"
                : currencyFormatter.format(taxPlan.projected_savings)}
            </p>
            <p className={styles.summaryCopy}>Estimated lifetime tax savings.</p>
          </article>
        </div>
      </section>

      <PanelCard className={styles.recommendation}>
        <div className={styles.recommendationLayout}>
          <span className={[styles.summaryIcon, styles.iconIndigo].join(" ")} aria-hidden="true">
            <Lightbulb />
          </span>
          <div>
            <p className={styles.eyebrow}>Top recommendation</p>
            <h2 className={styles.recommendationTitle}>
              {taxPlan.top_recommendation ?? "Your recommendation is being prepared."}
            </h2>
            <p className={styles.recommendationCopy}>
              Your advisor will review the timing, projected impact, and next steps with you.
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
