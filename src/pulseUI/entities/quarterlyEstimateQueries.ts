import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { caseApiGetJson } from "../shared/caseApi.ts";
import type { Uuid } from "../shared/planToolCase.ts";

const quarterlyEstimateQuarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);

const quarterlyEstimateRecordSchema = z.object({
  case_id: z.string().min(1),
  quarter: quarterlyEstimateQuarterSchema,
  due_date: z.string().min(1),
  estimated_payment: z.union([z.string().min(1), z.number()]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
  withholding_applied: z.union([z.string().min(1), z.number()]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
  covered_amount: z.union([z.string().min(1), z.number()]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
  remaining_due: z.union([z.string().min(1), z.number()]).transform((value) =>
    typeof value === "string" ? Number(value) : value,
  ),
});

const quarterlyEstimateResponseSchema = z.array(quarterlyEstimateRecordSchema);

export type QuarterlyEstimateRecord = z.infer<typeof quarterlyEstimateRecordSchema>;

export function quarterlyEstimatesQueryKey(caseId: Uuid | "unselected") {
  return ["quarterly-estimates", caseId] as const;
}

export async function fetchQuarterlyEstimates(caseId: Uuid): Promise<readonly QuarterlyEstimateRecord[]> {
  const payload = await caseApiGetJson<unknown>(`/v1/tax-plan-cycles/${caseId}/quarterly-estimates`);
  return quarterlyEstimateResponseSchema.parse(payload);
}

export function useQuarterlyEstimatesQuery(caseId: Uuid | null) {
  return useQuery({
    queryKey: quarterlyEstimatesQueryKey(caseId ?? "unselected"),
    queryFn: () => {
      if (caseId === null) {
        throw new Error("A valid case ID is required before fetching quarterly estimates.");
      }

      return fetchQuarterlyEstimates(caseId);
    },
    enabled: caseId !== null,
  });
}
