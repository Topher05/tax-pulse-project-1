import { useId } from "react";

import {
  type PlanCycleDetailTab,
  usePlanCycleDetailNavigation,
} from "./usePlanCycleDetailNavigation.ts";

function OverviewTab() {
  return (
    <section className="planCycleTabPanel" aria-labelledby="plan-cycle-overview-heading">
      <h2 id="plan-cycle-overview-heading">Overview</h2>
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
  commentDraft: string;
  setCommentDraft: (draft: string) => void;
}

function CommentsTab({ commentDraft, setCommentDraft }: CommentsTabProps) {
  return (
    <section className="planCycleTabPanel" aria-labelledby="plan-cycle-comments-heading">
      <h2 id="plan-cycle-comments-heading">Comments</h2>
      <textarea
        aria-label="Comment draft"
        className="planCycleCommentBox"
        value={commentDraft}
        onChange={(event) => {
          setCommentDraft(event.target.value);
        }}
      />
    </section>
  );
}

function AuditTrailTab() {
  return (
    <section className="planCycleTabPanel" aria-labelledby="plan-cycle-audit-trail-heading">
      <h2 id="plan-cycle-audit-trail-heading">Audit Trail</h2>
    </section>
  );
}

export function PlanCycleDetailRoute() {
  const tabLabelId = useId();
  const stageLabelId = useId();
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
  } = usePlanCycleDetailNavigation();

  const renderActiveTab = () => {
    switch (activeTab) {
      case "Overview":
        return <OverviewTab />;
      case "Scenarios":
        return <ScenariosTab />;
      case "Comments":
        return <CommentsTab commentDraft={commentDraft} setCommentDraft={setCommentDraft} />;
      case "Audit Trail":
        return <AuditTrailTab />;
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
