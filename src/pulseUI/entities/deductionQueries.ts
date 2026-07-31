import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { caseApiGetJson } from "../shared/caseApi.ts";

const deductionAmountSchema = z.number().finite().nonnegative();

const deductionQuerySchema = z.object({
  caseId: z.string().min(1),
  incomeEvents: z.array(
    z.object({
      source: z.string().min(1),
      amount: deductionAmountSchema,
      withholding: deductionAmountSchema,
    }),
  ),
  deductions: z.array(
    z.object({
      id: z.string().min(1),
      date: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      amount: deductionAmountSchema,
    }),
  ),
});

export type DeductionQueryPayload = z.infer<typeof deductionQuerySchema>;
export type DeductionQueryRecord = DeductionQueryPayload["deductions"][number];

export function deductionsQueryKey(caseId: string) {
  return ["deductions", caseId] as const;
}

export async function fetchDeductions(
  caseId: string,
): Promise<DeductionQueryPayload> {
  const payload = await caseApiGetJson<unknown>(`/v1/cases/${caseId}/deductions`);
  return deductionQuerySchema.parse(payload);
}

export function useDeductionsQuery(caseId: string) {
  return useQuery({
    queryKey: deductionsQueryKey(caseId),
    queryFn: () => fetchDeductions(caseId),
  });
}
