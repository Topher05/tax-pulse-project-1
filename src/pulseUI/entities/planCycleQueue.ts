export type PlanCycleQueueMetric = {
  label: string;
  value: string;
  caption: string;
};

export type PlanCycleQueueRow = {
  caseId: string;
  client: string;
  stage: string;
  owner: string;
  priority: string;
  dueDate: string;
  overdue: boolean;
};
