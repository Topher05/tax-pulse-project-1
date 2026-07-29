export const caseStages = [
  "Intake",
  "Data Aggregation",
  "Modeling",
  "Review",
  "Client Approval",
  "Executed",
  "Archived",
] as const;

export const detailTabs = ["Overview", "Scenarios", "Comments", "Audit Trail"] as const;

export type DetailTab = (typeof detailTabs)[number];
export type DetailStage = (typeof caseStages)[number];

export interface DetailsSearch {
  tab?: DetailTab;
  stage?: DetailStage;
}

export interface NormalizedDetailsSearch {
  tab: DetailTab;
  stage?: DetailStage;
}

function isDetailStage(stage: string): stage is DetailStage {
  return caseStages.includes(stage as DetailStage);
}

function isDetailTab(tab: string): tab is DetailTab {
  return detailTabs.includes(tab as DetailTab);
}

export function normalizeDetailsSearch(search: DetailsSearch): NormalizedDetailsSearch {
  const tab = search.tab ?? "Overview";
  const stage = search.stage;

  return { tab, stage };
}

export function validateDetailsSearch(search: Record<string, unknown>): DetailsSearch {
  return {
    tab: typeof search.tab === "string" && isDetailTab(search.tab) ? search.tab : undefined,
    stage:
      typeof search.stage === "string" && isDetailStage(search.stage)
        ? search.stage
        : undefined,
  };
}
