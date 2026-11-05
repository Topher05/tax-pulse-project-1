export const planToolPaths = [
  "/income",
  "/deductions",
  "/scenarios",
  "/quarterly-payments",
] as const;

export type PlanToolPath = (typeof planToolPaths)[number];
export type Uuid = string & { readonly __brand: "Uuid" };

export interface PlanToolSearch {
  plan?: string;
  caseId?: Uuid;
  invalidPlan?: boolean;
}

export interface NormalizedPlanToolSearch {
  routeKey: string | null;
  legacyCaseId: Uuid | null;
  hasInvalidCaseId: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const routeKeyPattern = /^[A-Za-z0-9_-]{22,24}$/;

export function isUuid(value: string): value is Uuid {
  return uuidPattern.test(value);
}

export function isRouteKey(value: string): boolean {
  return routeKeyPattern.test(value);
}

export function isPlanToolPath(pathname: string): pathname is PlanToolPath {
  return planToolPaths.includes(pathname as PlanToolPath);
}

export function normalizePlanToolSearch(
  search: Record<string, unknown>,
): NormalizedPlanToolSearch {
  if (search.invalidPlan === true) {
    return { routeKey: null, legacyCaseId: null, hasInvalidCaseId: true };
  }

  const rawPlan = search.plan;
  if (typeof rawPlan === "string" && rawPlan.trim().length > 0) {
    const routeKey = rawPlan.trim();
    return isRouteKey(routeKey)
      ? { routeKey, legacyCaseId: null, hasInvalidCaseId: false }
      : { routeKey: null, legacyCaseId: null, hasInvalidCaseId: true };
  }

  const rawCaseId = search.caseId;

  if (typeof rawCaseId !== "string" || rawCaseId.trim().length === 0) {
    return { routeKey: null, legacyCaseId: null, hasInvalidCaseId: false };
  }

  const caseId = rawCaseId.trim();

  if (!isUuid(caseId)) {
    return { routeKey: null, legacyCaseId: null, hasInvalidCaseId: true };
  }

  return { routeKey: null, legacyCaseId: caseId, hasInvalidCaseId: false };
}

export function validatePlanToolSearch(
  search: Record<string, unknown>,
): PlanToolSearch {
  const rawPlan = search.plan;
  if (typeof rawPlan === "string" && rawPlan.trim().length > 0) {
    return isRouteKey(rawPlan.trim()) ? { plan: rawPlan.trim() } : { invalidPlan: true };
  }
  const rawCaseId = search.caseId;

  if (typeof rawCaseId !== "string" || rawCaseId.trim().length === 0) {
    return {};
  }

  const caseId = rawCaseId.trim();

  return isUuid(caseId) ? { caseId } : { invalidPlan: true };
}
