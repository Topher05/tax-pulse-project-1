import { caseApiGetJson } from "../../shared/caseApi.ts";
import type { PlanCycleQueueRow } from "../../entities/taxPlanCycle.ts";

export interface TaxPlanCycleQueueApiRow {
  id: string;
  client_id: string;
  stage: string;
  owner: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  on_hold: boolean;
  hold_reason?: string | null;
  is_overdue: boolean;
  updated_at: string;
}

export interface TaxPlanCycleDetailsApiResponse {
  id: string;
  client_id: string;
  stage: string;
  owner: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  on_hold: boolean;
  hold_reason?: string | null;
  scenarios: readonly unknown[];
}

export interface TaxPlanCycleDetailsView {
  caseId: string;
  client: string;
  stage: string;
  owner: string;
  priority: string;
  dueDate: string;
  scenarioCount: number;
  onHold: boolean;
  overdue: boolean;
}

const displayDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export const taxPlanCycleQueueQueryKey = ["taxPlanCycle", "queue"] as const;

export function taxPlanCycleDetailsQueryKey(caseId: string) {
  return ["taxPlanCycle", "details", caseId] as const;
}

function formatDisplayDate(isoDate: string): string {
  return displayDateFormat.format(new Date(`${isoDate}T00:00:00.000Z`));
}

function toQueueRow(row: TaxPlanCycleQueueApiRow): PlanCycleQueueRow {
  return {
    caseId: row.id,
    client: row.client_id,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority.charAt(0).toUpperCase() + row.priority.slice(1),
    dueDate: formatDisplayDate(row.due_date),
    updatedDate: formatDisplayDate(row.updated_at.slice(0, 10)),
    overdue: row.is_overdue,
  };
}

function toDetailsView(
  row: TaxPlanCycleDetailsApiResponse,
): TaxPlanCycleDetailsView {
  return {
    caseId: row.id,
    client: row.client_id,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority.charAt(0).toUpperCase() + row.priority.slice(1),
    dueDate: formatDisplayDate(row.due_date),
    scenarioCount: row.scenarios.length,
    onHold: row.on_hold,
    overdue: row.due_date < new Date().toISOString().slice(0, 10),
  };
}

export async function fetchTaxPlanCycleQueue(): Promise<readonly PlanCycleQueueRow[]> {
  const payload = await caseApiGetJson<readonly TaxPlanCycleQueueApiRow[]>(
    "/v1/tax-plan-cycles",
  );

  return payload.map(toQueueRow);
}

export async function fetchTaxPlanCycleDetails(
  caseId: string,
): Promise<TaxPlanCycleDetailsView> {
  const payload = await caseApiGetJson<TaxPlanCycleDetailsApiResponse>(
    `/v1/tax-plan-cycles/${caseId}`,
  );

  return toDetailsView(payload);
}
