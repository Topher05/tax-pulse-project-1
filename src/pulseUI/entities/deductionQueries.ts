import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { caseApiGetJson } from "../shared/caseApi.ts";

const deductionAmountSchema = z.number().finite().nonnegative();

const deductionRecordSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.union([z.string().min(1), deductionAmountSchema]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
  tax_impact: z.union([z.string().min(1), deductionAmountSchema]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
  deleted: z.boolean(),
});

const deductionQuerySchema = z.array(deductionRecordSchema);

export type DeductionQueryRecord = z.infer<typeof deductionRecordSchema>;
export type DeductionQueryPayload = DeductionQueryRecord[];

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
