import { useQuery } from "@tanstack/react-query";

import {
  getLoaderTimeoutMode,
  loadClientRosterForLoaderTimeout,
} from "../shared/loaderTimeoutUtility.ts";
import type { ClientRosterRow } from "./clientRoster.ts";

export interface ClientRosterApiRow {
  id: string;
  clientName: string;
  filingSummary: string;
  ytdIncome: number;
  estimatedTax: number;
  quarterlyStatus: string | null;
}

export const clientRosterQueryKey = ["clientRoster"] as const;

export function useClientRosterQuery() {
  const loaderTimeoutMode = getLoaderTimeoutMode();

  // TODO: Remove mock integration before PR.
  return useQuery({
    queryKey: [...clientRosterQueryKey, loaderTimeoutMode] as const,
    queryFn: () => loadClientRosterForLoaderTimeout(loaderTimeoutMode),
  });
}
