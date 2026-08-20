import { useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useAuthenticatedFetch } from "../../auth/authenticatedFetch.ts";
import { EmptyState } from "../../components/EmptyState.tsx";
import { useNotificationToast } from "../../components/NotificationToast.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import {
  createErrorNotificationMessage,
  createInfoNotificationMessage,
  createSuccessNotificationMessage,
} from "../../entities/notificationMessage.ts";
import {
  fetchTaxPlanCycleAuditEntries,
  fetchTaxPlanCycleComments,
  fetchTaxPlanCycleDetails,
  taxPlanCycleAuditEntriesQueryKey,
  taxPlanCycleCommentsQueryKey,
  taxPlanCycleDetailsQueryKey,
} from "../../entities/taxPlanCycleQueries.ts";
import { caseApiPatchJson, CaseApiError } from "../../shared/caseApi.ts";

import styles from "./Details.module.css";
import {
  caseStages,
  detailTabs,
  type DetailStage,
  type DetailTab,
} from "./detailViewState.ts";

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

function getNextStage(stage: DetailStage): DetailStage | null {
  const stageIndex = caseStages.indexOf(stage);

  if (stageIndex < 0 || stageIndex >= caseStages.length - 1) {
    return null;
  }

  return caseStages[stageIndex + 1] as DetailStage;
}

function parseProblemPayload(body: string): { header?: string; message?: string } | null {
  try {
    const parsed = JSON.parse(body) as { title?: unknown; detail?: unknown };

    return {
      header: typeof parsed.title === "string" ? parsed.title : undefined,
      message: typeof parsed.detail === "string" ? parsed.detail : undefined,
    };
  } catch {
    if (body.trim().length === 0) {
      return null;
    }

    return { message: body };
  }
}

export function DetailsPage() {
  const { id: caseId = "" } = useParams({ from: "/_workspace/cycles/$id" });
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [commentDraft, setCommentDraft] = useState("");
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const stageLabelId = useId();
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationToast();

  useEffect(() => {
    setActiveTab("Overview");
    setCommentDraft("");
  }, [caseId]);

  const detailsQuery = useQuery({
    queryKey: taxPlanCycleDetailsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleDetails(caseId, authenticatedFetch),
    enabled: caseId.length > 0,
  });
  const auditEntriesQuery = useQuery({
    queryKey: taxPlanCycleAuditEntriesQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleAuditEntries(caseId, authenticatedFetch),
    enabled: caseId.length > 0 && activeTab === "Audit Trail",
  });
  const commentsQuery = useQuery({
    queryKey: taxPlanCycleCommentsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleComments(caseId),
    enabled: caseId.length > 0 && activeTab === "Comments",
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

  const selectedStage = details.stage;
  const activeStageIndex = caseStages.indexOf(details.stage as DetailStage);
  const nextStage = getNextStage(details.stage as DetailStage);

  const handleReassignAction = () => {
    showNotification(createErrorNotificationMessage("Implementation Details TBD.", "Reassign"));
  };

  const handleHoldAction = () => {
    showNotification(createInfoNotificationMessage("Implementation Details TBD.", "Hold"));
  };

  const handleAdvanceStage = async () => {
    if (isAdvancingStage || nextStage === null) {
      showNotification(
        createErrorNotificationMessage(
          nextStage === null
            ? "There is no further stage available for this cycle."
            : "The stage transition is already in progress.",
          "Advance Stage unavailable",
        ),
      );
      return;
    }

    setIsAdvancingStage(true);

    try {
      const transitioned = await caseApiPatchJson<{ stage: DetailStage }>(
        `/v1/tax-plan-cycles/${caseId}/transition`,
        { to_stage: nextStage },
        authenticatedFetch,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPlanCycleDetailsQueryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: taxPlanCycleAuditEntriesQueryKey(caseId) }),
      ]);

      showNotification(
        createSuccessNotificationMessage(
          `${details.stage} → ${transitioned.stage} transition successful.`,
          "Stage Advanced",
        ),
      );
    } catch (error) {
      let header = "Advance Stage failed";
      let message = "The stage transition could not be completed.";

      if (error instanceof CaseApiError) {
        const problem = parseProblemPayload(error.body);

        if (problem?.header) {
          header = problem.header;
        }

        if (problem?.message) {
          message = problem.message;
        }
      } else if (error instanceof Error && error.message.trim().length > 0) {
        message = error.message;
      }

      showNotification(createErrorNotificationMessage(message, header));
      await queryClient.invalidateQueries({ queryKey: taxPlanCycleAuditEntriesQueryKey(caseId) });
    } finally {
      setIsAdvancingStage(false);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "Overview":
        return (
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
        );
      case "Scenarios":
        return (
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
        );
      case "Comments":
        return (
          <PanelCard title="Comments">
            <div className={styles.commentList}>
              {commentsQuery.isPending ? (
                <p className={styles.stateCopy} role="status">
                  Loading comments...
                </p>
              ) : commentsQuery.isError ? (
                <p className={styles.stateCopy} role="alert">
                  Comments could not load.
                </p>
              ) : commentsQuery.data.length === 0 ? (
                <p className={styles.stateCopy}>No comments have been added for this case.</p>
              ) : (
                commentsQuery.data.map((comment) => (
                  <article className={styles.comment} key={comment.id}>
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
                ))
              )}
              <div className={styles.commentComposer}>
                <label className={styles.commentComposerField}>
                  <span className={styles.fieldLabel}>Comment draft</span>
                  <textarea
                    aria-label="Comment draft"
                    className={styles.commentInput}
                    value={commentDraft}
                    onChange={(event) => {
                      setCommentDraft(event.target.value);
                    }}
                  />
                </label>
                <button className={styles.primaryAction} type="button">
                  Post
                </button>
              </div>
            </div>
          </PanelCard>
        );
      case "Audit Trail":
        return (
          <PanelCard title="Audit Trail">
            {auditEntriesQuery.isPending ? (
              <p className={styles.stateCopy} role="status">
                Loading audit trail...
              </p>
            ) : auditEntriesQuery.isError ? (
              <p className={styles.stateCopy} role="alert">
                Audit trail could not load.
              </p>
            ) : auditEntriesQuery.data.length === 0 ? (
              <p className={styles.stateCopy}>No audit entries have been recorded for this case.</p>
            ) : (
              <div className={styles.auditList}>
                {auditEntriesQuery.data.map((entry, index) => (
                  <article className={styles.auditItem} key={entry.id}>
                    <span className={styles.auditIndex}>{index + 1}</span>
                    <div className={styles.auditBody}>
                      <div className={styles.auditHead}>
                        <span className={styles.auditActor}>{entry.actor}</span>
                        <span className={styles.auditTime}>{entry.occurredAt}</span>
                      </div>
                      <p className={styles.auditText}>{entry.action}</p>
                      <p className={styles.auditOutcome}>{entry.outcome}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </PanelCard>
        );
    }
  };

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
              Advisor: {details.owner} · Opened Apr 1, 2026 ·{" "}
              {details.onHold ? "On hold" : "Active"}
            </p>
          </div>

          <div className={styles.actionCluster}>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => {
                handleReassignAction();
              }}
            >
              Reassign
            </button>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={() => {
                handleHoldAction();
              }}
            >
              Hold
            </button>
            <button
              className={styles.primaryAction}
              type="button"
              disabled={isAdvancingStage || nextStage === null}
              onClick={() => {
                void handleAdvanceStage();
              }}
            >
              <span>{isAdvancingStage ? "Advancing..." : "Advance Stage"}</span>
              {!isAdvancingStage ? <ChevronRight className={styles.actionButtonIcon} aria-hidden="true" /> : null}
            </button>
          </div>
        </div>

        <section className={styles.stageSection} aria-labelledby={stageLabelId}>
          <ol className={styles.stageStepper} aria-label="Case stage progression">
            {caseStages.map((stage, index) => {
              const isActive = selectedStage === stage;
              const isComplete = index < activeStageIndex;

              return (
                <li key={stage} className={styles.stageStepItem}>
                  <div
                    className={[
                      styles.stageStep,
                      isActive ? styles.stageStepActive : "",
                      isComplete ? styles.stageStepComplete : "",
                    ].join(" ")}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className={styles.stageStepNumber}>{index + 1}</span>
                    <span>{stage}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
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

          {renderActiveTab()}
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
                <span className={styles.sidePanelValue}>{selectedStage}</span>
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
