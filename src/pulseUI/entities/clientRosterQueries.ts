import { useQuery } from "@tanstack/react-query";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import type { ClientRosterRow } from "./clientRoster.ts";

export interface ClientRosterApiRow {
  id: string;
  clientName: string;
  filingStatus: string;
  ytdIncome: number;
  estimatedTax: number;
  quarterlyStatus: string | null;
}

export const clientRosterQueryKey = ["clientRoster"] as const;

function toClientRosterRow(row: ClientRosterApiRow): ClientRosterRow {
  return {
    id: row.id,
    clientName: row.clientName,
    filingStatus: row.filingStatus,
    ytdIncome: row.ytdIncome,
    estimatedTax: row.estimatedTax,
    quarterlyStatus: row.quarterlyStatus,
  };
}

export async function fetchClientRoster(fetcher?: typeof fetch): Promise<readonly ClientRosterRow[]> {
  const payload = await caseApiGetJson<readonly ClientRosterApiRow[]>("/v1/clients", fetcher);

  return payload.map(toClientRosterRow);
}

export function useClientRosterQuery() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: clientRosterQueryKey,
    queryFn: () => fetchClientRoster(authenticatedFetch),
  });
}
