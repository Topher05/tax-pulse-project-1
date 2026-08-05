import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import type { Uuid } from "../shared/planToolCase.ts";

const deductionAmountSchema = z.coerce.number().finite().nonnegative();

const deductionRecordSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: deductionAmountSchema,
  tax_impact: deductionAmountSchema,
  deleted: z.boolean(),
});

const deductionQuerySchema = z.array(deductionRecordSchema);

export type DeductionQueryRecord = z.infer<typeof deductionRecordSchema>;
export type DeductionQueryPayload = DeductionQueryRecord[];

export function deductionsQueryKey(caseId: Uuid | "unselected") {
  return ["deductions", caseId] as const;
}

export async function fetchDeductions(
  caseId: Uuid,
  fetcher?: typeof fetch,
): Promise<DeductionQueryPayload> {
  const payload = await caseApiGetJson<unknown>(`/v1/cases/${caseId}/deductions`, fetcher);
  return deductionQuerySchema.parse(payload);
}

export function useDeductionsQuery(caseId: Uuid | null) {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: deductionsQueryKey(caseId ?? "unselected"),
    queryFn: () => {
      if (caseId === null) {
        throw new Error("A valid case ID is required before fetching deductions.");
      }

      return fetchDeductions(caseId, authenticatedFetch);
    },
    enabled: caseId !== null,
  });
}
