import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson, caseApiPostJson } from "../shared/caseApi.ts";

export interface ClientActionItem {
  id: number;
  case_id: string;
  description: string;
  deadline: string;
  completed: boolean;
}

export const clientActionItemsQueryKey = ["clientPortal", "actionItems"] as const;

async function fetchClientActionItems(fetcher?: typeof fetch): Promise<readonly ClientActionItem[]> {
  return await caseApiGetJson<readonly ClientActionItem[]>("/v1/portal/action-items", fetcher);
}

async function completeClientActionItem(
  actionItemId: number,
  fetcher?: typeof fetch,
): Promise<ClientActionItem> {
  return await caseApiPostJson<ClientActionItem>(
    `/v1/portal/action-items/${actionItemId}/complete`,
    undefined,
    fetcher,
  );
}

export function useClientActionItemsQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: clientActionItemsQueryKey,
    queryFn: () => fetchClientActionItems(authenticatedFetch),
  });
}

export function useCompleteClientActionItemMutation() {
  const authenticatedFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionItemId: number) => completeClientActionItem(actionItemId, authenticatedFetch),
    onSuccess: (completedItem) => {
      queryClient.setQueryData<readonly ClientActionItem[]>(clientActionItemsQueryKey, (items) =>
        items?.map((item) => (item.id === completedItem.id ? completedItem : item)) ?? [],
      );
    },
  });
}
