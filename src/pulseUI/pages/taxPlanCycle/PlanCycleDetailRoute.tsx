import { useEffect, useId, useState } from "react";
import { useParams } from "@tanstack/react-router";

import {
  type PlanCycleDetailStage,
  type PlanCycleDetailTab,
  usePlanCycleDetailNavigation,
} from "./usePlanCycleDetailNavigation.ts";

interface PlanCycleOverview {
  period: string;
  recommendation: string;
  projectedSavings: string;
  riskFlags: readonly string[];
  advisor: string;
  reviewer: string;
  stageEntered: string;
  dueDate: string;
  onHold: boolean;
  priority: "Low" | "Medium" | "High";
  currentStage: PlanCycleDetailStage;
}

interface PlanCycleComment {
  id: string;
  author: string;
  role: string;
  body: string;
  createdAt: string;
}

interface PlanCycleAuditEntry {
  id: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: string;
}

interface PlanCycleTabStateCopy {
  id: string;
  emptyTitle: string;
  emptyDetail: string;
}

interface AuditEntryApiRow {
  id: string;
  case_id: string;
  actor: string;
  action: string;
  outcome: string;
  occurred_at: string;
}

type AuditTrailState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "ready"; entries: readonly PlanCycleAuditEntry[] }
  | { status: "error" };

const overview: PlanCycleOverview = {
  period: "2026 Q4",
  recommendation: "Accelerate charitable contributions before year-end and harvest short-term losses.",
  projectedSavings: "$18,400",
  riskFlags: ["AMT exposure", "Missing brokerage statement"],
  advisor: "Avery Advisor",
  reviewer: "Riley Reviewer",
  stageEntered: "2026-07-20",
  dueDate: "2026-08-15",
  onHold: false,
  priority: "High",
  currentStage: "Review",
};

const commentStateCopy: PlanCycleTabStateCopy = {
  id: "comments",
  emptyTitle: "No comments yet",
  emptyDetail: "Start the discussion by adding a case comment.",
};

const auditStateCopy: PlanCycleTabStateCopy = {
  id: "audit-trail",
  emptyTitle: "No audit entries yet",
  emptyDetail: "Workflow history will appear after the first recorded case action.",
};

const auditLoadingCopy = {
  id: "audit-trail-loading",
  title: "Loading audit trail",
  detail: "Audit entries will appear here after the case history loads.",
};

const auditErrorCopy = {
  id: "audit-trail-error",
  title: "Audit trail unavailable",
  detail: "The audit trail could not be loaded. Try refreshing the case.",
};

interface OverviewTabProps {
  overview: PlanCycleOverview;
}

function OverviewTab({ overview }: OverviewTabProps) {
  return (
    <section
      className="planCycleTabPanel planCycleOverview"
      aria-labelledby="plan-cycle-overview-heading"
    >
      <h2 id="plan-cycle-overview-heading">Overview</h2>
      <div className="planCycleOverviewGrid">
        <section className="planCycleBrief" aria-labelledby="plan-cycle-brief-heading">
          <div>
            <p className="planCycleEyebrow">Plan brief</p>
            <h3 id="plan-cycle-brief-heading">Quarterly tax plan</h3>
          </div>

          <dl className="planCycleBriefStats">
            <div>
              <dt>Period</dt>
              <dd>{overview.period}</dd>
            </div>
            <div>
              <dt>Projected savings</dt>
              <dd>{overview.projectedSavings}</dd>
            </div>
          </dl>

          <section className="planCycleRecommendation" aria-labelledby="recommendation-heading">
            <h4 id="recommendation-heading">Recommendation</h4>
            <p>{overview.recommendation}</p>
          </section>

          <section className="planCycleRiskFlags" aria-labelledby="risk-flags-heading">
            <h4 id="risk-flags-heading">Risk flags</h4>
            <ul>
              {overview.riskFlags.map((riskFlag) => (
                <li key={riskFlag}>{riskFlag}</li>
              ))}
            </ul>
          </section>
        </section>

        <aside className="planCycleProperties" aria-labelledby="case-properties-heading">
          <h3 id="case-properties-heading">Case Properties</h3>
          <dl>
            <div>
              <dt>Advisor</dt>
              <dd>{overview.advisor}</dd>
            </div>
            <div>
              <dt>Reviewer</dt>
              <dd>{overview.reviewer}</dd>
            </div>
            <div>
              <dt>Stage entered</dt>
              <dd>{overview.stageEntered}</dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd>{overview.dueDate}</dd>
            </div>
            <div>
              <dt>On hold</dt>
              <dd>{overview.onHold ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{overview.priority}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}

function ScenariosTab() {
  return (
    <section className="planCycleTabPanel" aria-labelledby="plan-cycle-scenarios-heading">
      <h2 id="plan-cycle-scenarios-heading">Scenarios</h2>
    </section>
  );
}

interface CommentsTabProps {
  comments: readonly PlanCycleComment[];
  commentDraft: string;
  setCommentDraft: (draft: string) => void;
}

function EmptyTabState({ copy }: { copy: PlanCycleTabStateCopy }) {
  return (
    <section className="planCycleStatePanel" aria-labelledby={`${copy.id}-empty-heading`}>
      <h3 id={`${copy.id}-empty-heading`}>{copy.emptyTitle}</h3>
      <p>{copy.emptyDetail}</p>
    </section>
  );
}

function LoadingTabState({ copy }: { copy: typeof auditLoadingCopy }) {
  return (
    <section className="planCycleStatePanel" aria-labelledby={`${copy.id}-heading`}>
      <span className="planCycleStateSkeleton" aria-hidden="true" />
      <h3 id={`${copy.id}-heading`}>{copy.title}</h3>
      <p>{copy.detail}</p>
    </section>
  );
}

function ErrorTabState({ copy }: { copy: typeof auditErrorCopy }) {
  return (
    <section
      className="planCycleStatePanel planCycleStatePanelError"
      aria-labelledby={`${copy.id}-heading`}
      role="alert"
    >
      <h3 id={`${copy.id}-heading`}>{copy.title}</h3>
      <p>{copy.detail}</p>
    </section>
  );
}

function CommentsTab({
  comments,
  commentDraft,
  setCommentDraft,
}: CommentsTabProps) {
  return (
    <section
      className="planCycleTabPanel planCycleDiscussion"
      aria-labelledby="plan-cycle-comments-heading"
    >
      <h2 id="plan-cycle-comments-heading">Comments</h2>
      {comments.length > 0 ? (
        <ol className="planCycleCommentList" aria-label="Case comments">
          {comments.map((comment) => (
            <li className="planCycleCommentItem" key={comment.id}>
              <div className="planCycleEntryHeader">
                <div>
                  <h3>{comment.author}</h3>
                  <p>{comment.role}</p>
                </div>
                <time>{comment.createdAt}</time>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyTabState copy={commentStateCopy} />
      )}

      <div className="planCycleCommentComposer">
        <label htmlFor="plan-cycle-comment-draft">Add comment</label>
        <textarea
          id="plan-cycle-comment-draft"
          aria-label="Comment draft"
          className="planCycleCommentBox"
          value={commentDraft}
          onChange={(event) => {
            setCommentDraft(event.target.value);
          }}
        />
      </div>
    </section>
  );
}

interface AuditTrailTabProps {
  auditTrailState: AuditTrailState;
}

function AuditTrailTab({ auditTrailState }: AuditTrailTabProps) {
  return (
    <section
      className="planCycleTabPanel planCycleAudit"
      aria-labelledby="plan-cycle-audit-trail-heading"
    >
      <h2 id="plan-cycle-audit-trail-heading">Audit Trail</h2>
      {auditTrailState.status === "loading" ? (
        <LoadingTabState copy={auditLoadingCopy} />
      ) : null}
      {auditTrailState.status === "error" ? (
        <ErrorTabState copy={auditErrorCopy} />
      ) : null}
      {auditTrailState.status === "empty" ? (
        <EmptyTabState copy={auditStateCopy} />
      ) : null}
      {auditTrailState.status === "ready" ? (
        <ol className="planCycleAuditList" aria-label="Read-only audit entries">
          {auditTrailState.entries.map((entry) => (
            <li className="planCycleAuditItem" key={entry.id}>
              <div className="planCycleEntryHeader">
                <div>
                  <h3>{entry.action}</h3>
                  <p>{entry.actor}</p>
                </div>
                <time>{entry.occurredAt}</time>
              </div>
              <span className="planCycleAuditOutcome">{entry.outcome}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function isAuditEntryApiRow(value: unknown): value is AuditEntryApiRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === "string" &&
    typeof row.case_id === "string" &&
    typeof row.actor === "string" &&
    typeof row.action === "string" &&
    typeof row.outcome === "string" &&
    typeof row.occurred_at === "string"
  );
}

function parseAuditEntriesResponse(payload: unknown): readonly PlanCycleAuditEntry[] {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Audit trail response was not an object.");
  }

  const rows = (payload as Record<string, unknown>).audit_entries;

  if (!Array.isArray(rows) || !rows.every(isAuditEntryApiRow)) {
    throw new Error("Audit trail response did not include valid audit entries.");
  }

  return rows.map((entry) => ({
    id: entry.id,
    actor: entry.actor,
    action: entry.action,
    outcome: entry.outcome,
    occurredAt: entry.occurred_at,
  }));
}

export function PlanCycleDetailRoute() {
  const tabLabelId = useId();
  const stageLabelId = useId();
  const { caseId } = useParams({ strict: false }) as { caseId?: string };
  const comments: readonly PlanCycleComment[] = [];
  const [auditTrailState, setAuditTrailState] = useState<AuditTrailState>({
    status: "loading",
  });
  const {
    activeStage,
    activeStageIndex,
    activeTab,
    commentDraft,
    setActiveStage,
    setActiveTab,
    setCommentDraft,
    stages,
    tabs,
  } = usePlanCycleDetailNavigation({ initialStage: overview.currentStage });

  useEffect(() => {
    if (!caseId) {
      setAuditTrailState({ status: "error" });
      return;
    }

    const abortController = new AbortController();

    setAuditTrailState({ status: "loading" });
    void fetch(`/v1/tax-plan-cycles/${encodeURIComponent(caseId)}/audit-entries`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Audit trail request failed.");
        }

        return parseAuditEntriesResponse(await response.json());
      })
      .then((entries) => {
        setAuditTrailState(
          entries.length > 0 ? { status: "ready", entries } : { status: "empty" },
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setAuditTrailState({ status: "error" });
      });

    return () => {
      abortController.abort();
    };
  }, [caseId]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "Overview":
        return <OverviewTab overview={overview} />;
      case "Scenarios":
        return <ScenariosTab />;
      case "Comments":
        return (
          <CommentsTab
            comments={comments}
            commentDraft={commentDraft}
            setCommentDraft={setCommentDraft}
          />
        );
      case "Audit Trail":
        return <AuditTrailTab auditTrailState={auditTrailState} />;
    }
  };

  return (
    <div className="planCycleDetail">
      <section className="planCycleStepper" aria-labelledby={stageLabelId}>
        <h2 id={stageLabelId}>Stage</h2>
        <ol>
          {stages.map((stage, index) => (
            <li key={stage}>
              <button
                className="planCycleStep"
                type="button"
                aria-label={stage}
                aria-current={activeStage === stage ? "step" : undefined}
                data-complete={index < activeStageIndex ? "true" : undefined}
                onClick={() => {
                  setActiveStage(stage);
                }}
              >
                <span className="planCycleStepNumber">{index + 1}</span>
                <span>{stage}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="planCycleTabs" aria-labelledby={tabLabelId}>
        <h2 id={tabLabelId}>Detail Tabs</h2>
        <div className="planCycleTabList" role="tablist" aria-label="Plan cycle detail tabs">
          {tabs.map((tab) => (
            <button
              className="planCycleTab"
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              key={tab}
              onClick={() => {
                setActiveTab(tab);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {renderActiveTab()}
      </section>
    </div>
  );
}

export type { PlanCycleDetailTab };
