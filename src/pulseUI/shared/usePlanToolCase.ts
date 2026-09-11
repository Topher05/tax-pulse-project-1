import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import {
  fetchTaxPlanCycleQueue,
  resolveTaxPlanCycleRouteKey,
  taxPlanCycleQueueQueryKey,
  taxPlanCycleRouteKeyQueryKey,
} from "../entities/taxPlanCycleQueries.ts";
import { normalizePlanToolSearch, type Uuid } from "./planToolCase.ts";

export interface ResolvedPlanToolCase {
  caseId: Uuid | null;
  routeKey: string | null;
  hasInvalidCaseId: boolean;
}

export function usePlanToolCase(): ResolvedPlanToolCase {
  const search = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>,
  });
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();
  const normalized = normalizePlanToolSearch(search);
  const routeKeyQuery = useQuery({
    queryKey: taxPlanCycleRouteKeyQueryKey(normalized.routeKey ?? ""),
    queryFn: () => resolveTaxPlanCycleRouteKey(normalized.routeKey!, authenticatedFetch),
    enabled: normalized.routeKey !== null,
  });
  const legacyQueueQuery = useQuery({
    queryKey: taxPlanCycleQueueQueryKey,
    queryFn: () => fetchTaxPlanCycleQueue(authenticatedFetch),
    enabled: normalized.legacyCaseId !== null,
  });
  const legacyPlan = legacyQueueQuery.data?.find((plan) => plan.caseId === normalized.legacyCaseId);

  useEffect(() => {
    if (!legacyPlan) return;
    void navigate({ search: { plan: legacyPlan.routeKey }, replace: true } as never);
  }, [legacyPlan, navigate]);

  if (normalized.routeKey !== null) {
    return {
      caseId: (routeKeyQuery.data?.caseId as Uuid | undefined) ?? null,
      routeKey: normalized.routeKey,
      hasInvalidCaseId: normalized.hasInvalidCaseId || routeKeyQuery.isError,
    };
  }

  return {
    caseId: (legacyPlan?.caseId as Uuid | undefined) ?? null,
    routeKey: legacyPlan?.routeKey ?? null,
    hasInvalidCaseId:
      normalized.hasInvalidCaseId ||
      (normalized.legacyCaseId !== null && legacyQueueQuery.isError),
  };
}

export function useSetPlanToolRouteKey(): (routeKey: string) => void {
  const navigate = useNavigate();

  return (routeKey: string) => {
    void navigate({ search: { plan: routeKey }, replace: true } as never);
  };
}
