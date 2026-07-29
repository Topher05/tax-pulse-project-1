import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import styles from "./Details.module.css";
import {
  fetchTaxPlanCycleDetails,
  taxPlanCycleDetailsQueryKey,
} from "./queries.ts";
import { EmptyState } from "../../components/EmptyState.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { WorkflowStepper } from "../../components/WorkflowStepper.tsx";

const caseStages = [
  "Intake",
  "Data Aggregation",
  "Modeling",
  "Review",
  "Client Approval",
  "Executed",
] as const;

const detailTabs = ["Overview", "Scenarios", "Comments", "Audit Trail"] as const;

const sampleScenarios = [
  {
    name: "Increase retirement contributions",
    description: "Boost 401(k) deferrals and re-run the modeling baseline.",
    result: "$4,500 estimated savings",
  },
  {
    name: "Keep baseline",
    description: "Hold current assumptions and preserve the current cashflow profile.",
    result: "No change from baseline",
  },
] as const;

const sampleComments = [
  {
    initials: "DC",
    author: "Dana Cohen, CPA",
    when: "Today · 11:08",
    text: "I’ve narrowed it down to the combined Roth + DAF strategy. We can walk through it on the 12th.",
  },
  {
    initials: "RP",
    author: "Riley Park",
    when: "Mar 30",
    text: "All Q1 data is in. We’re starting the modeling now and should have a draft ready soon.",
  },
] as const;

const sampleAuditEntries = [
  "Case created and assigned to Dana Cohen",
  "Scenario modeling request queued",
  "Review stage entered by Firm Admin",
] as const;

function priorityTone(priority: string): "danger" | "warning" | "info" {
  const normalized = priority.toLowerCase();

  if (normalized === "high") {
    return "danger";
  }

  if (normalized === "medium") {
    return "warning";
  }

  return "info";
}

export function DetailsPage() {
  const { id: caseId = "" } = useParams({ from: "/cycles/$id" });
  const [activeTab, setActiveTab] = useState<(typeof detailTabs)[number]>("Overview");
  const detailsQuery = useQuery({
    queryKey: taxPlanCycleDetailsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleDetails(caseId),
    enabled: caseId.length > 0,
  });

  if (detailsQuery.isPending) {
    return (
      <PanelCard
        title="Loading case details"
        description="Fetching the case record and associated workflow state."
      >
        <p className={styles.stateCopy}>Loading case details...</p>
      </PanelCard>
    );
  }

  if (detailsQuery.isError) {
    return (
      <EmptyState
        title="Case details could not load"
        description={
          detailsQuery.error instanceof Error
            ? detailsQuery.error.message
            : "Case details request failed."
        }
      />
    );
  }

  const details = detailsQuery.data;

  if (!details) {
    return null;
  }

  return (
    <div className={styles.page}>
      <PanelCard className={styles.caseHeader}>
        <div className={styles.caseHeaderRow}>
          <div className={styles.caseHeadline}>
            <div className={styles.caseMetaRow}>
              <span className={styles.caseId}>CASE-{details.caseId}</span>
              <StatusPill tone={priorityTone(details.priority)}>{details.priority}</StatusPill>
            </div>
            <h2 className={styles.caseTitle}>{details.client} - Q2 2026 Tax Plan</h2>
            <p className={styles.caseSubtitle}>
              Advisor: {details.owner} · Opened Apr 1, 2026 · {details.onHold ? "On hold" : "Active"}
            </p>
          </div>

          <div className={styles.actionCluster}>
            <button className={styles.secondaryAction} type="button">
              Reassign
            </button>
            <button className={styles.secondaryAction} type="button">
              Hold
            </button>
            <button className={styles.primaryAction} type="button">
              Advance Stage →
            </button>
          </div>
        </div>

        <WorkflowStepper stages={caseStages} activeStage={details.stage} />
      </PanelCard>

      <div className={styles.detailGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.tabBar} role="tablist" aria-label="Case tabs">
            {detailTabs.map((tab) => (
              <button
                key={tab}
                className={[styles.tabItem, activeTab === tab ? styles.activeTab : ""].join(" ")}
                role="tab"
                aria-selected={activeTab === tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Overview" ? (
            <PanelCard title="Plan Brief">
              <div className={styles.overviewGrid}>
                <div>
                  <p className={styles.fieldLabel}>Planning Period</p>
                  <p className={styles.fieldValue}>Q2 2026 (April-June)</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>Recommendation</p>
                  <p className={styles.fieldValue}>Convert $40k traditional to Roth</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>Projected Savings</p>
                  <p className={styles.fieldValuePositive}>$8,420 lifetime</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>Risk Flags</p>
                  <p className={styles.fieldValue}>
                    <StatusPill tone="warning">SE income spike</StatusPill>
                  </p>
                </div>
              </div>
            </PanelCard>
          ) : null}

          {activeTab === "Scenarios" ? (
            <PanelCard title="Scenario Summary">
              <div className={styles.scenarioList}>
                {sampleScenarios.map((scenario) => (
                  <article className={styles.scenarioCard} key={scenario.name}>
                    <div className={styles.scenarioHeader}>
                      <h3 className={styles.scenarioName}>{scenario.name}</h3>
                      <StatusPill tone="info">{scenario.result}</StatusPill>
                    </div>
                    <p className={styles.scenarioDescription}>{scenario.description}</p>
                  </article>
                ))}
              </div>
            </PanelCard>
          ) : null}

          {activeTab === "Comments" ? (
            <PanelCard title="Comments">
              <div className={styles.commentList}>
                {sampleComments.map((comment) => (
                  <article className={styles.comment} key={`${comment.author}-${comment.when}`}>
                    <div className={styles.commentAvatar} aria-hidden="true">
                      {comment.initials}
                    </div>
                    <div className={styles.commentBody}>
                      <div className={styles.commentHead}>
                        <span className={styles.commentAuthor}>{comment.author}</span>
                        <span className={styles.commentTime}>{comment.when}</span>
                      </div>
                      <p className={styles.commentText}>{comment.text}</p>
                    </div>
                  </article>
                ))}
                <div className={styles.commentComposer}>
                  <input
                    className={styles.commentInput}
                    type="text"
                    placeholder="Add a comment, @mention a teammate..."
                  />
                  <button className={styles.primaryAction} type="button">
                    Post
                  </button>
                </div>
              </div>
            </PanelCard>
          ) : null}

          {activeTab === "Audit Trail" ? (
            <PanelCard title="Audit Trail">
              <div className={styles.auditList}>
                {sampleAuditEntries.map((entry, index) => (
                  <div className={styles.auditItem} key={entry}>
                    <span className={styles.auditIndex}>{index + 1}</span>
                    <span className={styles.auditText}>{entry}</span>
                  </div>
                ))}
              </div>
            </PanelCard>
          ) : null}
        </div>

        <aside className={styles.sidePanel}>
          <PanelCard title="Case Properties">
            <div className={styles.sidePanelRows}>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Advisor</span>
                <span className={styles.sidePanelValue}>{details.owner}</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Reviewer (Firm Admin)</span>
                <span className={styles.sidePanelValue}>Marcus Hill</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Stage Entered</span>
                <span className={styles.sidePanelValue}>{details.stage}</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Due Date</span>
                <span className={styles.sidePanelValue}>{details.dueDate}</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Scenarios</span>
                <span className={styles.sidePanelValue}>{details.scenarioCount}</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>On Hold</span>
                <span className={styles.sidePanelValue}>{details.onHold ? "Yes" : "No"}</span>
              </div>
              <div className={styles.sidePanelRow}>
                <span className={styles.sidePanelLabel}>Priority</span>
                <span className={styles.sidePanelValue}>
                  <StatusPill tone={priorityTone(details.priority)}>{details.priority}</StatusPill>
                </span>
              </div>
            </div>
          </PanelCard>

          <PanelCard title="Quick Actions">
            <div className={styles.quickActions}>
              <button className={styles.secondaryAction} type="button">
                Run new scenario
              </button>
              <button className={styles.secondaryAction} type="button">
                Schedule client meeting
              </button>
              <button className={styles.secondaryAction} type="button">
                Flag for compliance
              </button>
              <button className={styles.dangerAction} type="button">
                Close cycle
              </button>
            </div>
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}
