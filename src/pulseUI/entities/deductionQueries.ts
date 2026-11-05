import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { caseApiGetJson, caseApiSendJson } from "../shared/caseApi.ts";
import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import type { Uuid } from "../shared/planToolCase.ts";

const deductionAmountSchema = z.coerce.number().nonnegative();

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
const deductionCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1),
  category: z.string().min(1),
  amount: deductionAmountSchema,
});

export type DeductionQueryRecord = z.infer<typeof deductionRecordSchema>;
export type DeductionQueryPayload = DeductionQueryRecord[];
export type DeductionCreatePayload = z.infer<typeof deductionCreateSchema>;

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

export async function createDeduction(
  caseId: Uuid,
  input: DeductionCreatePayload,
  fetcher?: typeof fetch,
): Promise<DeductionQueryRecord> {
  const request = {
    method: "POST",
    body: deductionCreateSchema.parse(input),
  };
  const payload = fetcher
    ? await caseApiSendJson<unknown>(`/v1/cases/${caseId}/deductions`, request, fetcher)
    : await caseApiSendJson<unknown>(`/v1/cases/${caseId}/deductions`, request);
  return deductionRecordSchema.parse(payload);
}

export function useDeductionsQuery(caseId: Uuid | null) {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: deductionsQueryKey(caseId ?? "unselected"),
    queryFn: () => {
      if (caseId === null) {
        throw new Error("Choose a valid tax plan before fetching deductions.");
      }

      return fetchDeductions(caseId, authenticatedFetch);
    },
    enabled: caseId !== null,
  });
}

export function useCreateDeductionMutation(caseId: Uuid | null) {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();

  return useMutation({
    mutationFn: (input: DeductionCreatePayload) => {
      if (caseId === null) {
        throw new Error("Choose a valid tax plan before creating deductions.");
      }

      return createDeduction(caseId, input, authenticatedFetch);
    },
    onSuccess: async () => {
      if (caseId !== null) {
        await queryClient.invalidateQueries({ queryKey: deductionsQueryKey(caseId) });
      }
    },
  });
}
