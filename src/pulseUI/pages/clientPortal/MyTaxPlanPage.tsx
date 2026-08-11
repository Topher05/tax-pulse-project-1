import { CalendarDays, Lightbulb, PiggyBank, UserRound } from "lucide-react";

import styles from "./MyTaxPlanPage.module.css";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { WorkflowStepper } from "../../components/WorkflowStepper.tsx";
import { useClientTaxPlanQuery } from "../../entities/clientTaxPlanQueries.ts";
import { caseStages } from "../taxPlanCycle/detailViewState.ts";

const portalSummary = {
  nextMeeting: "May 12, 2026 at 10:00 AM",
  projectedSavings: "$8,420",
  topRecommendation: "Convert $40k from a traditional IRA to a Roth IRA.",
} as const;

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
            <p className={styles.summaryValue}>{taxPlan.owner}</p>
            <p className={styles.summaryCopy}>Your primary planning contact.</p>
          </article>

          <article className={styles.summaryCard}>
            <span className={[styles.summaryIcon, styles.iconAmber].join(" ")} aria-hidden="true">
              <CalendarDays />
            </span>
            <p className={styles.summaryLabel}>Next meeting</p>
            <p className={styles.summaryValue}>{portalSummary.nextMeeting}</p>
            <p className={styles.summaryCopy}>Scheduled time with your advisor.</p>
          </article>

          <article className={styles.summaryCard}>
            <span className={[styles.summaryIcon, styles.iconGreen].join(" ")} aria-hidden="true">
              <PiggyBank />
            </span>
            <p className={styles.summaryLabel}>Projected savings</p>
            <p className={styles.savingsValue}>{portalSummary.projectedSavings}</p>
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
            <h2 className={styles.recommendationTitle}>{portalSummary.topRecommendation}</h2>
            <p className={styles.recommendationCopy}>
              Your advisor will review the timing, projected impact, and next steps with you.
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}
