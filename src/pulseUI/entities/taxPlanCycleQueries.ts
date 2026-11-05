import { caseApiGetJson, caseApiPostJson } from "../shared/caseApi.ts";
import {
  displayClientName,
  displayPersonName,
  formatPlanningPeriod,
  formatTaxPlanLabel,
  removeTechnicalIdentifiers,
} from "../shared/displayLabels.ts";
import type { PlanCycleQueueRow } from "./taxPlanCycle.ts";

export interface TaxPlanCycleQueueApiRow {
  id: string;
  route_key: string;
  client_id: string;
  client_name: string;
  planning_period?: string;
  cycle_label?: string;
  owner_display_name?: string;
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
  route_key?: string;
  client_id: string;
  client_name?: string;
  planning_period?: string;
  cycle_label?: string;
  owner_display_name?: string;
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
  routeKey?: string;
  client: string;
  planningPeriod?: string;
  cycleLabel?: string;
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
  actor_display_name?: string;
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

export interface TaxPlanCycleCommentApiRow {
  id: string;
  case_id: string;
  actor_id: string;
  actor_role: string;
  author_display_name: string;
  body: string;
  created_at: string;
}

export interface TaxPlanCycleCommentsApiResponse {
  comments: readonly TaxPlanCycleCommentApiRow[];
}

export interface TaxPlanCycleCommentView {
  id: string;
  initials: string;
  author: string;
  when: string;
  text: string;
}

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

const commentDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const taxPlanCycleQueueQueryKey = ["taxPlanCycle", "queue"] as const;

export function taxPlanCycleRouteKeyQueryKey(routeKey: string) {
  return ["taxPlanCycle", "routeKey", routeKey] as const;
}

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

function getInitials(displayName: string): string {
  const nameParts = displayName
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return nameParts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function toCommentView(row: TaxPlanCycleCommentApiRow): TaxPlanCycleCommentView {
  const author = displayPersonName(row.author_display_name);
  return {
    id: row.id,
    initials: getInitials(author),
    author,
    when: commentDateTimeFormat.format(new Date(row.created_at)),
    text: row.body,
  };
}

function toQueueRow(row: TaxPlanCycleQueueApiRow): PlanCycleQueueRow {
  return {
    caseId: row.id,
    routeKey: row.route_key,
    client: displayClientName(row.client_name || row.client_id),
    clientId: row.client_id,
    clientName: row.client_name,
    planningPeriod: formatPlanningPeriod(row.planning_period),
    cycleLabel: formatTaxPlanLabel({
      clientName: row.client_name,
      planningPeriod: row.planning_period,
      cycleLabel: row.cycle_label,
    }),
    stage: row.stage,
    owner: displayPersonName(row.owner_display_name ?? row.owner),
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
  const clientName = displayClientName(row.client_name || row.client_id);

  return {
    caseId: row.id,
    routeKey: row.route_key,
    client: clientName,
    planningPeriod: formatPlanningPeriod(row.planning_period),
    cycleLabel: formatTaxPlanLabel({
      clientName,
      planningPeriod: row.planning_period,
      cycleLabel: row.cycle_label,
    }),
    stage: row.stage,
    owner: displayPersonName(row.owner_display_name ?? row.owner),
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
    actor: displayPersonName(row.actor_display_name ?? row.actor),
    action: removeTechnicalIdentifiers(row.action),
    outcome: removeTechnicalIdentifiers(row.outcome),
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

export async function resolveTaxPlanCycleRouteKey(
  routeKey: string,
  fetcher?: typeof fetch,
): Promise<{ caseId: string; routeKey: string }> {
  const payload = await caseApiGetJson<{ id: string; route_key: string }>(
    `/v1/tax-plan-cycles/route-keys/${encodeURIComponent(routeKey)}`,
    fetcher,
  );
  return { caseId: payload.id, routeKey: payload.route_key };
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
  caseId: string,
  fetcher?: typeof fetch,
): Promise<readonly TaxPlanCycleCommentView[]> {
  const payload = await caseApiGetJson<TaxPlanCycleCommentsApiResponse>(
    `/v1/tax-plan-cycles/${caseId}/comments`,
    fetcher,
  );

  return payload.comments.map(toCommentView);
}

export async function postTaxPlanCycleComment(
  caseId: string,
  body: string,
  fetcher?: typeof fetch,
): Promise<TaxPlanCycleCommentView> {
  const payload = await caseApiPostJson<TaxPlanCycleCommentApiRow>(
    `/v1/tax-plan-cycles/${caseId}/comments`,
    { body },
    fetcher,
  );

  return toCommentView(payload);
}
