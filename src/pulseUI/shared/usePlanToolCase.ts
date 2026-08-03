import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  isUuid,
  normalizePlanToolSearch,
  type NormalizedPlanToolSearch,
  type Uuid,
} from "./planToolCase.ts";

export function usePlanToolCase(): NormalizedPlanToolSearch {
  const search = useRouterState({
    select: (state) => state.location.search as Record<string, unknown>,
  });

  return normalizePlanToolSearch(search);
}

export function useSetPlanToolCaseId(): (caseId: Uuid) => void {
  const navigate = useNavigate();

  return (caseId: Uuid) => {
    if (!isUuid(caseId)) {
      return;
    }

    void navigate({ search: { caseId } } as never);
  };
}
