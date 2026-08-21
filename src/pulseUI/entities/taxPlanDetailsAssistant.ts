import { caseApiPostJson, CaseApiError } from "../shared/caseApi.ts";
import { useMutation } from "@tanstack/react-query";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";

export interface TaxPlanDetailsAssistantResponse {
  message: string;
}

export async function postTaxPlanDetailsAssistant(
  caseId: string,
  fetcher?: typeof fetch,
): Promise<TaxPlanDetailsAssistantResponse> {
  return await caseApiPostJson<TaxPlanDetailsAssistantResponse>(
    `/v1/tax-plan-cycles/${caseId}/assist`,
    {},
    fetcher,
  );
}

export function useTaxPlanDetailsAssistantMutation() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useMutation({
    mutationFn: ({ caseId }: { caseId: string }) =>
      postTaxPlanDetailsAssistant(caseId, authenticatedFetch),
  });
}

export function parseTaxPlanDetailsAssistantErrorMessage(error: unknown): string {
  if (!(error instanceof CaseApiError)) {
    return error instanceof Error && error.message.trim().length > 0
      ? error.message
      : "The assistant request could not be completed.";
  }

  const rawBody = error.body.trim();
  if (rawBody.length === 0) {
    return `Assistant request failed with HTTP ${error.status}.`;
  }

  try {
    const parsed = JSON.parse(rawBody) as { message?: unknown; detail?: unknown };

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }

    if (typeof parsed.detail === "string" && parsed.detail.trim().length > 0) {
      return parsed.detail;
    }
  } catch {
    return rawBody;
  }

  return `Assistant request failed with HTTP ${error.status}.`;
}
