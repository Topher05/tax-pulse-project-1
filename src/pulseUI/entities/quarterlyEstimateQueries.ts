import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import type { Uuid } from "../shared/planToolCase.ts";

const quarterlyEstimateQuarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);

const quarterlyEstimateRecordSchema = z.object({
  case_id: z.string().min(1),
  tax_year: z.string().regex(/^\d{4}$/),
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
  status: z.enum(["Paid", "Due"]),
});

const quarterlyEstimateResponseSchema = z.array(quarterlyEstimateRecordSchema);

export type QuarterlyEstimateRecord = z.infer<typeof quarterlyEstimateRecordSchema>;
export type QuarterlyEstimateQuarter = z.infer<typeof quarterlyEstimateQuarterSchema>;

export function quarterlyEstimatesQueryKey(caseId: Uuid | "unselected") {
  return ["quarterly-estimates", caseId] as const;
}

export async function fetchQuarterlyEstimates(
  caseId: Uuid,
  fetcher?: typeof fetch,
): Promise<readonly QuarterlyEstimateRecord[]> {
  const payload = await caseApiGetJson<unknown>(
    `/v1/tax-plan-cycles/${caseId}/quarterly-estimates`,
    fetcher,
  );
  return quarterlyEstimateResponseSchema.parse(payload);
}

export function useQuarterlyEstimatesQuery(caseId: Uuid | null) {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: quarterlyEstimatesQueryKey(caseId ?? "unselected"),
    queryFn: () => {
      if (caseId === null) {
        throw new Error("A valid case ID is required before fetching quarterly estimates.");
      }

      return fetchQuarterlyEstimates(caseId, authenticatedFetch);
    },
    enabled: caseId !== null,
  });
}
