import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  normalizePlanToolSearch,
  type NormalizedPlanToolSearch,
} from "./planToolCase.ts";

export function usePlanToolCase(): NormalizedPlanToolSearch {
  const search = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>,
  });

  return normalizePlanToolSearch(search);
}

export function useSetPlanToolCaseId(): (caseId: string) => void {
  const navigate = useNavigate();

  return (caseId: string) => {
    void navigate({ search: { caseId } } as never);
  };
}
