import { caseApiGetJson } from "../shared/caseApi.ts";
import type { PlanCycleQueueRow } from "./taxPlanCycle.ts";

export interface TaxPlanCycleQueueApiRow {
  id: string;
  client_id: string;
  client_name: string;
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
  scenarios?: readonly unknown[];
  taxpayer_identifier_validation?: {
    verified_name?: string | null;
    provider?: string | null;
  };
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
  holdReason?: string | null;
  overdue: boolean;
  taxpayerIdentifierValidation?: {
    verifiedName?: string | null;
    provider?: string | null;
  };
}

export interface TaxPlanCycleAuditEntryApiRow {
  id: string;
  case_id: string;
  actor: string;
  action: string;
  outcome: string;
  occurred_at: string;
}

export interface TaxPlanCycleAuditEntriesApiResponse {
  audit_entries: readonly TaxPlanCycleAuditEntryApiRow[];
}

export interface TaxPlanCycleAuditEntryView {
  id: string;
  actor: string;
  action: string;
  outcome: string;
  occurredAt: string;
}

export interface TaxPlanCycleCommentView {
  id: string;
  initials: string;
  author: string;
  when: string;
  text: string;
}

const sampleComments = [
  {
    id: "comment-001",
    initials: "DC",
    author: "Dana Cohen, CPA",
    when: "Today - 11:08",
    text: "I've narrowed it down to the combined Roth + DAF strategy. We can walk through it on the 12th.",
  },
  {
    id: "comment-002",
    initials: "RP",
    author: "Riley Park",
    when: "Mar 30",
    text: "All Q1 data is in. We're starting the modeling now and should have a draft ready soon.",
  },
] as const satisfies readonly TaxPlanCycleCommentView[];

const displayDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const auditDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const taxPlanCycleQueueQueryKey = ["taxPlanCycle", "queue"] as const;

export function taxPlanCycleDetailsQueryKey(caseId: string) {
  return ["taxPlanCycle", "details", caseId] as const;
}

export function taxPlanCycleAuditEntriesQueryKey(caseId: string) {
  return ["taxPlanCycle", "auditEntries", caseId] as const;
}

export function taxPlanCycleCommentsQueryKey(caseId: string) {
  return ["taxPlanCycle", "comments", caseId] as const;
}

function formatDisplayDate(isoDate: string): string {
  return displayDateFormat.format(new Date(`${isoDate}T00:00:00.000Z`));
}

function formatAuditDateTime(isoDateTime: string): string {
  return auditDateTimeFormat.format(new Date(isoDateTime));
}

function toQueueRow(row: TaxPlanCycleQueueApiRow): PlanCycleQueueRow {
  return {
    caseId: row.id,
    client: row.client_id,
    clientId: row.client_id,
    clientName: row.client_name,
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
  const scenarios = row.scenarios ?? [];

  return {
    caseId: row.id,
    client: row.client_id,
    stage: row.stage,
    owner: row.owner,
    priority: row.priority.charAt(0).toUpperCase() + row.priority.slice(1),
    dueDate: formatDisplayDate(row.due_date),
    scenarioCount: scenarios.length,
    onHold: row.on_hold,
    ...(row.hold_reason == null ? {} : { holdReason: row.hold_reason }),
    overdue: row.due_date < new Date().toISOString().slice(0, 10),
    ...(row.taxpayer_identifier_validation
      ? {
          taxpayerIdentifierValidation: {
            verifiedName: row.taxpayer_identifier_validation.verified_name,
            provider: row.taxpayer_identifier_validation.provider,
          },
        }
      : {}),
  };
}

function toAuditEntryView(row: TaxPlanCycleAuditEntryApiRow): TaxPlanCycleAuditEntryView {
  return {
    id: row.id,
    actor: row.actor,
    action: row.action,
    outcome: row.outcome,
    occurredAt: formatAuditDateTime(row.occurred_at),
  };
}

export async function fetchTaxPlanCycleQueue(
  fetcher?: typeof fetch,
): Promise<readonly PlanCycleQueueRow[]> {
  const payload = await caseApiGetJson<readonly TaxPlanCycleQueueApiRow[]>(
    "/v1/tax-plan-cycles",
    fetcher,
  );

  return payload.map(toQueueRow);
}

export async function fetchTaxPlanCycleDetails(
  caseId: string,
  fetcher?: typeof fetch,
): Promise<TaxPlanCycleDetailsView> {
  const payload = await caseApiGetJson<TaxPlanCycleDetailsApiResponse>(
    `/v1/tax-plan-cycles/${caseId}`,
    fetcher,
  );

  return toDetailsView(payload);
}

export async function fetchTaxPlanCycleAuditEntries(
  caseId: string,
  fetcher?: typeof fetch,
): Promise<readonly TaxPlanCycleAuditEntryView[]> {
  const payload = await caseApiGetJson<TaxPlanCycleAuditEntriesApiResponse>(
    `/v1/tax-plan-cycles/${caseId}/audit-entries`,
    fetcher,
  );

  return payload.audit_entries.map(toAuditEntryView);
}

export async function fetchTaxPlanCycleComments(
  _caseId: string,
): Promise<readonly TaxPlanCycleCommentView[]> {
  return sampleComments;
}
