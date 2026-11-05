import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useAuthenticatedFetch } from "../../auth/authenticatedFetch.ts";
import { EmptyState } from "../../components/EmptyState.tsx";
import { useNotificationToast } from "../../components/NotificationToast.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { StatusPill } from "../../components/StatusPill.tsx";
import { useAssistantPanel } from "../../components/assist/assistantPanel.tsx";
import {
  createErrorNotificationMessage,
  createSuccessNotificationMessage,
} from "../../entities/notificationMessage.ts";
import { buildTaxPlanDetailsAssistantRecommendation } from "../../entities/taxPlanDetailsAssistant.ts";
import {
  fetchTaxPlanCycleAuditEntries,
  fetchTaxPlanCycleComments,
  fetchTaxPlanCycleDetails,
  resolveTaxPlanCycleRouteKey,
  postTaxPlanCycleComment,
  taxPlanCycleAuditEntriesQueryKey,
  taxPlanCycleCommentsQueryKey,
  taxPlanCycleDetailsQueryKey,
  taxPlanCycleQueueQueryKey,
  taxPlanCycleRouteKeyQueryKey,
} from "../../entities/taxPlanCycleQueries.ts";
import { caseApiPatchJson, CaseApiError } from "../../shared/caseApi.ts";
import { isRouteKey, isUuid } from "../../shared/planToolCase.ts";

import styles from "./Details.module.css";
import { caseStages, detailTabs, type DetailStage, type DetailTab } from "./detailViewState.ts";

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

const assistantRecommendation = "Apply the estimated-payment safe-harbor threshold for non-withheld income";

function priorityTone(priority: string): "danger" | "warning" | "info" {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return "danger";
  if (normalized === "medium") return "warning";
  return "info";
}

function getNextStage(stage: DetailStage): DetailStage | null {
  const stageIndex = caseStages.indexOf(stage);
  if (stageIndex < 0 || stageIndex >= caseStages.length - 1) return null;
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
    return body.trim().length === 0 ? null : { message: body };
  }
}

export function DetailsPage() {
  const { id: routeReference = "" } = useParams({ from: "/_workspace/cycles/$id" });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>("Overview");
  const [commentDraft, setCommentDraft] = useState("");
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [holdReasonDraft, setHoldReasonDraft] = useState("");
  const [isUpdatingHold, setIsUpdatingHold] = useState(false);
  const authenticatedFetch = useAuthenticatedFetch();
  const routeKeyQuery = useQuery({
    queryKey: taxPlanCycleRouteKeyQueryKey(routeReference),
    queryFn: () => resolveTaxPlanCycleRouteKey(routeReference, authenticatedFetch),
    enabled: isRouteKey(routeReference),
  });
  const caseId = isRouteKey(routeReference)
    ? (routeKeyQuery.data?.caseId ?? "")
    : routeReference;
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationToast();
  const { registerFabAnchor, setAssistantCaseContext } = useAssistantPanel();
  const holdDialogTitleId = useId();
  const holdReasonFieldId = useId();
  const holdReasonHelpId = useId();

  useEffect(() => {
    setActiveTab("Overview");
    setCommentDraft("");
    setIsHoldModalOpen(false);
    setHoldReasonDraft("");
    setIsAdvancingStage(false);
    setIsUpdatingHold(false);
  }, [routeReference]);

  const detailsQuery = useQuery({
    queryKey: taxPlanCycleDetailsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleDetails(caseId, authenticatedFetch),
    enabled: caseId.length > 0,
  });

  useEffect(() => {
    if (!isUuid(routeReference) || !detailsQuery.data?.routeKey) return;
    void navigate({
      to: "/cycles/$id",
      params: { id: detailsQuery.data.routeKey },
      replace: true,
    });
  }, [detailsQuery.data?.routeKey, navigate, routeReference]);

  useEffect(() => {
    if (detailsQuery.data === undefined) return;

    setAssistantCaseContext({
      caseId: detailsQuery.data.caseId,
      caseTitle: detailsQuery.data.cycleLabel ?? "Tax Plan",
      clientName: detailsQuery.data.client,
      recommendation: buildTaxPlanDetailsAssistantRecommendation({
        stage: detailsQuery.data.stage,
        owner: detailsQuery.data.owner,
        priority: detailsQuery.data.priority,
        verifiedName: detailsQuery.data.taxpayerIdentifierValidation?.verifiedName,
        provider: detailsQuery.data.taxpayerIdentifierValidation?.provider,
      }),
      stage: detailsQuery.data.stage,
      advisor: detailsQuery.data.owner,
      dueDate: detailsQuery.data.dueDate,
    });

    return () => setAssistantCaseContext(null);
  }, [detailsQuery.data, setAssistantCaseContext]);

  const auditEntriesQuery = useQuery({
    queryKey: taxPlanCycleAuditEntriesQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleAuditEntries(caseId, authenticatedFetch),
    enabled: caseId.length > 0 && activeTab === "Audit Trail",
  });
  const commentsQuery = useQuery({
    queryKey: taxPlanCycleCommentsQueryKey(caseId),
    queryFn: () => fetchTaxPlanCycleComments(caseId, authenticatedFetch),
    enabled: caseId.length > 0 && activeTab === "Comments",
  });
  const postCommentMutation = useMutation({
    mutationFn: async (body: string) =>
      postTaxPlanCycleComment(caseId, body, authenticatedFetch),
    onSuccess: async () => {
      setCommentDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPlanCycleCommentsQueryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: taxPlanCycleAuditEntriesQueryKey(caseId) }),
      ]);
      showNotification(createSuccessNotificationMessage("Comment posted.", "Comment Saved"));
    },
    onError: (error) => {
      let message = "The comment could not be saved.";

      if (error instanceof CaseApiError) {
        const problem = parseProblemPayload(error.body);

        if (problem?.message) {
          message = problem.message;
        }
      } else if (error instanceof Error && error.message.trim().length > 0) {
        message = error.message;
      }

      showNotification(createErrorNotificationMessage(message, "Comment failed"));
    },
  });

  if ((isRouteKey(routeReference) && routeKeyQuery.isPending) || detailsQuery.isPending) {
    return (
      <PanelCard title="Loading case details" description="Fetching the case record and associated workflow state.">
        <p className={styles.stateCopy}>Loading case details...</p>
      </PanelCard>
    );
  }

  if (routeKeyQuery.isError || detailsQuery.isError) {
    return (
      <EmptyState
        title="Case details could not load"
        description={
          routeKeyQuery.error instanceof Error
            ? routeKeyQuery.error.message
            : detailsQuery.error instanceof Error
              ? detailsQuery.error.message
              : "Case details request failed."
        }
      />
    );
  }

  const details = detailsQuery.data;
  if (!details) return null;

  const selectedStage = details.stage;
  const activeStageIndex = caseStages.indexOf(details.stage as DetailStage);
  const nextStage = getNextStage(details.stage as DetailStage);

  const invalidateCycleQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taxPlanCycleDetailsQueryKey(caseId) }),
      queryClient.invalidateQueries({ queryKey: taxPlanCycleAuditEntriesQueryKey(caseId) }),
      queryClient.invalidateQueries({ queryKey: taxPlanCycleCommentsQueryKey(caseId) }),
      queryClient.invalidateQueries({ queryKey: taxPlanCycleQueueQueryKey }),
    ]);
  };

  const handleReassignAction = () => {
    showNotification(createErrorNotificationMessage("Implementation Details TBD.", "Reassign"));
  };

  const submitHoldStatus = async (onHold: boolean, holdReason?: string) => {
    if (isUpdatingHold) return;

    setIsUpdatingHold(true);
    try {
      const response = await caseApiPatchJson<{ on_hold: boolean; hold_reason?: string | null }>(
        `/v1/tax-plan-cycles/${caseId}/hold`,
        onHold ? { on_hold: true as const, hold_reason: (holdReason ?? "").trim() } : { on_hold: false as const },
        authenticatedFetch,
      );
      await invalidateCycleQueries();
      setHoldReasonDraft(response.hold_reason ?? "");
      setIsHoldModalOpen(false);
      showNotification(
        createSuccessNotificationMessage(
          response.on_hold ? "Hold placed on this cycle." : "Hold removed from this cycle.",
          response.on_hold ? "Hold placed" : "Hold removed",
        ),
      );
    } catch (error) {
      let header = onHold ? "Place hold failed" : "Remove hold failed";
      let message = onHold ? "The hold could not be applied." : "The hold could not be removed.";
      if (error instanceof CaseApiError) {
        const problem = parseProblemPayload(error.body);
        if (problem?.header) header = problem.header;
        if (problem?.message) message = problem.message;
        if (error.status === 409) {
          await queryClient.invalidateQueries({ queryKey: taxPlanCycleDetailsQueryKey(caseId) });
        }
      } else if (error instanceof Error && error.message.trim().length > 0) {
        message = error.message;
      }
      showNotification(createErrorNotificationMessage(message, header));
    } finally {
      setIsUpdatingHold(false);
    }
  };

  const handleHoldAction = () => {
    if (details.onHold) {
      void submitHoldStatus(false);
      return;
    }
    setHoldReasonDraft("");
    setIsHoldModalOpen(true);
  };

  const handleAdvanceStage = async () => {
    if (isAdvancingStage || nextStage === null || details.onHold) {
      showNotification(
        createErrorNotificationMessage(
          details.onHold
            ? "Remove the hold before advancing this cycle."
            : nextStage === null
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
        queryClient.invalidateQueries({ queryKey: taxPlanCycleQueueQueryKey }),
      ]);
      showNotification(
        createSuccessNotificationMessage(`${details.stage} → ${transitioned.stage} transition successful.`, "Stage Advanced"),
      );
    } catch (error) {
      let header = "Advance Stage failed";
      let message = "The stage transition could not be completed.";
      if (error instanceof CaseApiError) {
        const problem = parseProblemPayload(error.body);
        if (problem?.header) header = problem.header;
        if (problem?.message) message = problem.message;
        if (error.status === 409) {
          await queryClient.invalidateQueries({ queryKey: taxPlanCycleDetailsQueryKey(caseId) });
        }
      } else if (error instanceof Error && error.message.trim().length > 0) {
        message = error.message;
      }
      showNotification(createErrorNotificationMessage(message, header));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPlanCycleAuditEntriesQueryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: taxPlanCycleDetailsQueryKey(caseId) }),
      ]);
    } finally {
      setIsAdvancingStage(false);
    }
  };

  const handlePostComment = () => {
    const trimmedDraft = commentDraft.trim();

    if (trimmedDraft.length === 0 || postCommentMutation.isPending) {
      return;
    }

    postCommentMutation.mutate(trimmedDraft);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "Overview":
        return (
          <PanelCard title="Plan Brief">
            <div className={styles.overviewGrid}>
              <div>
                <p className={styles.fieldLabel}>Planning Period</p>
                <p className={styles.fieldValue}>{details.planningPeriod}</p>
              </div>
              <div>
                <p className={styles.fieldLabel}>Recommendation</p>
                <p className={styles.fieldValue}>{assistantRecommendation}</p>
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
                <p className={styles.stateCopy} role="status">Loading comments...</p>
              ) : commentsQuery.isError ? (
                <p className={styles.stateCopy} role="alert">Comments could not load.</p>
              ) : commentsQuery.data.length === 0 ? (
                <p className={styles.stateCopy}>No comments have been added for this case.</p>
              ) : (
                commentsQuery.data.map((comment) => (
                  <article className={styles.comment} key={comment.id}>
                    <div className={styles.commentAvatar} aria-hidden="true">{comment.initials}</div>
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
                    onChange={(event) => setCommentDraft(event.target.value)}
                  />
                </label>
                <button
                  className={styles.primaryAction}
                  type="button"
                  disabled={commentDraft.trim().length === 0 || postCommentMutation.isPending}
                  onClick={handlePostComment}
                >
                  {postCommentMutation.isPending ? "Posting..." : "Post"}
                </button>
                {postCommentMutation.isError ? (
                  <p className={styles.stateCopy} role="alert">
                    Comment could not be saved. Please try again.
                  </p>
                ) : null}
              </div>
            </div>
          </PanelCard>
        );
      case "Audit Trail":
        return (
          <PanelCard title="Audit Trail">
            {auditEntriesQuery.isPending ? (
              <p className={styles.stateCopy} role="status">Loading audit trail...</p>
            ) : auditEntriesQuery.isError ? (
              <p className={styles.stateCopy} role="alert">Audit trail could not load.</p>
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
              <span className={styles.caseId}>{details.cycleLabel}</span>
              <StatusPill tone={priorityTone(details.priority)}>{details.priority}</StatusPill>
            </div>
            <h2 className={styles.caseTitle}>{details.cycleLabel}</h2>
            <p className={styles.caseSubtitle}>
              Advisor: {details.owner} · {details.onHold ? "On hold" : "Active"}
            </p>
            {details.onHold ? (
              <p id={holdReasonHelpId} className={styles.holdSupportText}>
                Remove the hold before advancing this cycle.
              </p>
            ) : null}
          </div>
          <div className={styles.actionCluster}>
            <button className={styles.secondaryAction} type="button" onClick={handleReassignAction}>Reassign</button>
            <button
              className={styles.secondaryAction}
              type="button"
              onClick={handleHoldAction}
              disabled={isUpdatingHold}
            >
              {details.onHold ? "Remove hold" : "Hold"}
            </button>
            <button
              className={styles.primaryAction}
              type="button"
              disabled={isAdvancingStage || nextStage === null || details.onHold}
              aria-describedby={details.onHold ? holdReasonHelpId : undefined}
              onClick={() => void handleAdvanceStage()}
            >
              <span>{isAdvancingStage ? "Advancing..." : "Advance Stage"}</span>
              {!isAdvancingStage ? <ChevronRight className={styles.actionButtonIcon} aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
        <div className={styles.stageSection}>
          <ol className={styles.stageStepper} aria-label="Case stage progression" tabIndex={0}>
            {caseStages.map((stage, index) => {
              const isActive = selectedStage === stage;
              const isComplete = index < activeStageIndex;
              return (
                <li key={stage} className={styles.stageStepItem}>
                  <div
                    className={[styles.stageStep, isActive ? styles.stageStepActive : "", isComplete ? styles.stageStepComplete : ""].join(" ")}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className={styles.stageStepNumber}>{index + 1}</span>
                    <span>{stage}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
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
                onClick={() => setActiveTab(tab)}
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
              {details.onHold && details.holdReason ? (
                <div className={styles.sidePanelRow}>
                  <span className={styles.sidePanelLabel}>Hold Reason</span>
                  <span className={styles.sidePanelValue}>{details.holdReason}</span>
                </div>
              ) : null}
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
              <button className={styles.secondaryAction} type="button">Run new scenario</button>
              <button className={styles.secondaryAction} type="button">Schedule client meeting</button>
              <button className={styles.secondaryAction} type="button">Flag for compliance</button>
              <button className={styles.dangerAction} type="button">Close cycle</button>
            </div>
          </PanelCard>
          <div ref={registerFabAnchor} className={styles.assistantFabAnchor} />
        </aside>
      </div>
      {isHoldModalOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setIsHoldModalOpen(false)}>
          <div
            className={styles.modalShell}
            role="dialog"
            aria-modal="true"
            aria-labelledby={holdDialogTitleId}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsHoldModalOpen(false);
              }
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id={holdDialogTitleId} className={styles.modalTitle}>Place hold</h3>
              <p className={styles.modalCopy}>Enter a short reason so the team knows why the cycle is paused.</p>
            </div>
            <label className={styles.modalField} htmlFor={holdReasonFieldId}>
              <span className={styles.fieldLabel}>Hold reason</span>
              <input
                id={holdReasonFieldId}
                className={styles.modalInput}
                type="text"
                value={holdReasonDraft}
                autoFocus
                onChange={(event) => setHoldReasonDraft(event.target.value)}
              />
            </label>
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} type="button" onClick={() => setIsHoldModalOpen(false)}>
                Cancel
              </button>
              <button
                className={styles.primaryAction}
                type="button"
                disabled={isUpdatingHold || holdReasonDraft.trim().length === 0}
                onClick={() => void submitHoldStatus(true, holdReasonDraft)}
              >
                {isUpdatingHold ? "Placing..." : "Place Hold"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
