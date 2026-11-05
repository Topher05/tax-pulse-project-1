import { useQuery } from "@tanstack/react-query";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import { displayPersonName } from "../shared/displayLabels.ts";

export interface ClientTaxPlanCycle {
  id: string;
  client_id: string;
  client_name?: string;
  planning_period?: string;
  owner_display_name?: string;
  cycle_label?: string;
  stage: string;
  owner: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  on_hold: boolean;
  hold_reason?: string;
  advisor: string;
  next_meeting: string | null;
  projected_savings: number | null;
  top_recommendation: string | null;
  scenarios: readonly ClientTaxPlanScenario[];
}

export interface ClientTaxPlanScenario {
  id: string;
  name: string;
  total_tax: number;
  delta_vs_baseline: number;
}

export const clientTaxPlanQueryKey = ["clientPortal", "myTaxPlan"] as const;
export const clientTaxPlanRefreshIntervalMs = 15_000;

export async function fetchClientTaxPlan(
  fetcher?: typeof fetch,
): Promise<ClientTaxPlanCycle> {
  const taxPlan = await caseApiGetJson<ClientTaxPlanCycle>("/v1/portal/my-tax-plan", fetcher);
  return {
    ...taxPlan,
    advisor: displayPersonName(taxPlan.advisor),
  };
}

export function useClientTaxPlanQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: clientTaxPlanQueryKey,
    queryFn: () => fetchClientTaxPlan(authenticatedFetch),
    refetchInterval: clientTaxPlanRefreshIntervalMs,
    refetchOnWindowFocus: true,
  });
}
