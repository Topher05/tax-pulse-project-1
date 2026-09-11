export type PlanCycleQueueMetric = {
  label: string;
  value: string;
  caption: string;
};

export type PlanCycleQueueRow = {
  caseId: string;
  client: string;
  clientId?: string;
  clientName?: string;
  planningPeriod?: string;
  cycleLabel?: string;
  stage: string;
  owner: string;
  priority: string;
  dueDate: string;
  updatedDate: string;
  overdue: boolean;
};
