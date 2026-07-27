import { useMemo, useState } from "react";

export const planCycleDetailTabs = ["Overview", "Scenarios", "Comments", "Audit Trail"] as const;

export type PlanCycleDetailTab = (typeof planCycleDetailTabs)[number];

export const planCycleDetailStages = [
  "Intake",
  "Data Aggregation",
  "Modeling",
  "Review",
  "Client Approval",
  "Executed",
  "Archived",
] as const;

export type PlanCycleDetailStage = (typeof planCycleDetailStages)[number];

export interface UsePlanCycleDetailNavigationOptions {
  initialStage?: PlanCycleDetailStage;
  initialTab?: PlanCycleDetailTab;
}

export interface PlanCycleDetailNavigationState {
  activeStage: PlanCycleDetailStage;
  activeStageIndex: number;
  activeTab: PlanCycleDetailTab;
  commentDraft: string;
  setActiveStage: (stage: PlanCycleDetailStage) => void;
  setActiveTab: (tab: PlanCycleDetailTab) => void;
  setCommentDraft: (draft: string) => void;
  stages: readonly PlanCycleDetailStage[];
  tabs: readonly PlanCycleDetailTab[];
}

export function usePlanCycleDetailNavigation({
  initialStage = "Intake",
  initialTab = "Overview",
}: UsePlanCycleDetailNavigationOptions = {}): PlanCycleDetailNavigationState {
  const [activeStage, setActiveStage] = useState<PlanCycleDetailStage>(initialStage);
  const [activeTab, setActiveTab] = useState<PlanCycleDetailTab>(initialTab);
  const [commentDraft, setCommentDraft] = useState("");

  const activeStageIndex = useMemo(
    () => planCycleDetailStages.indexOf(activeStage),
    [activeStage],
  );

  return {
    activeStage,
    activeStageIndex,
    activeTab,
    commentDraft,
    setActiveStage,
    setActiveTab,
    setCommentDraft,
    stages: planCycleDetailStages,
    tabs: planCycleDetailTabs,
  };
}
