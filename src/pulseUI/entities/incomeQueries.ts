import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";
import { caseApiGetJson } from "../shared/caseApi.ts";
import type { Uuid } from "../shared/planToolCase.ts";

const incomeSourceCategorySchema = z.enum([
  "w2",
  "1099",
  "capital-gains",
  "rental",
  "other",
]);
const incomeCurrencySchema = z.union([z.string().min(1), z.number()]).transform((value, ctx) => {
  const parsedValue = typeof value === "string" ? Number(value) : value;

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    ctx.addIssue({
      code: "custom",
      message: "Income currency values must be finite non-negative numbers.",
    });

    return z.NEVER;
  }

  return parsedValue;
});

const incomeEventSchema = z.object({
  id: z.string().min(1),
  case_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.string().min(1),
  type: incomeSourceCategorySchema,
  amount: incomeCurrencySchema,
  withholding: incomeCurrencySchema,
});

const incomeEventsResponseSchema = z.array(incomeEventSchema);

export type IncomeSourceCategory = z.infer<typeof incomeSourceCategorySchema>;
export type IncomeEventRecord = z.infer<typeof incomeEventSchema>;
export type IncomeEventsPayload = IncomeEventRecord[];

export function incomeEventsQueryKey(caseId: Uuid | "unselected") {
  return ["income-events", caseId] as const;
}

export async function fetchIncomeEvents(
  caseId: Uuid,
  fetcher?: typeof fetch,
): Promise<IncomeEventsPayload> {
  const payload = await caseApiGetJson<unknown>(`/v1/cases/${caseId}/income-events`, fetcher);
  return incomeEventsResponseSchema.parse(payload);
}

export function useIncomeEventsQuery(caseId: Uuid | null) {
  const authenticatedFetch = useAuthenticatedFetch();

  return useQuery({
    queryKey: incomeEventsQueryKey(caseId ?? "unselected"),
    queryFn: () => {
      if (caseId === null) {
        throw new Error("A valid case ID is required before fetching income events.");
      }

      return fetchIncomeEvents(caseId, authenticatedFetch);
    },
    enabled: caseId !== null,
  });
}
