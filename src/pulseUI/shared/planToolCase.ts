export const planToolPaths = [
  "/income",
  "/deductions",
  "/scenarios",
  "/quarterly-payments",
] as const;

export type PlanToolPath = (typeof planToolPaths)[number];
export type Uuid = string & { readonly __brand: "Uuid" };

export interface PlanToolSearch {
  caseId?: Uuid;
  invalidCaseId?: boolean;
}

export interface NormalizedPlanToolSearch {
  caseId: Uuid | null;
  hasInvalidCaseId: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): value is Uuid {
  return uuidPattern.test(value);
}

export function isPlanToolPath(pathname: string): pathname is PlanToolPath {
  return planToolPaths.includes(pathname as PlanToolPath);
}

export function normalizePlanToolSearch(
  search: Record<string, unknown>,
): NormalizedPlanToolSearch {
  if (search.invalidCaseId === true) {
    return { caseId: null, hasInvalidCaseId: true };
  }

  const rawCaseId = search.caseId;

  if (typeof rawCaseId !== "string" || rawCaseId.trim().length === 0) {
    return { caseId: null, hasInvalidCaseId: false };
  }

  const caseId = rawCaseId.trim();

  if (!isUuid(caseId)) {
    return { caseId: null, hasInvalidCaseId: true };
  }

  return { caseId, hasInvalidCaseId: false };
}

export function validatePlanToolSearch(
  search: Record<string, unknown>,
): PlanToolSearch {
  const rawCaseId = search.caseId;

  if (typeof rawCaseId !== "string" || rawCaseId.trim().length === 0) {
    return {};
  }

  const caseId = rawCaseId.trim();

  return isUuid(caseId) ? { caseId } : { invalidCaseId: true };
}
