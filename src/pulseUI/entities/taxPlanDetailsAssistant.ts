import { caseApiPostJson, CaseApiError } from "../shared/caseApi.ts";
import { useMutation } from "@tanstack/react-query";

import { useAuthenticatedFetch } from "../auth/authenticatedFetch.ts";

export interface TaxPlanDetailsAssistantResponse {
  explanation: string;
  citations: readonly TaxPlanDetailsAssistantCitation[];
}

export interface TaxPlanDetailsAssistantCitation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_type: "tax_code" | "playbook";
  fictional_issuer: string;
  section_id: string;
  section_path: string;
  synthetic_notice: string;
}

export interface TaxPlanDetailsAssistantRequest {
  recommendation_context: {
    recommendation: string;
    question?: string;
  };
}

export interface TaxPlanDetailsAssistantError {
  title: string;
  detail: string;
  status?: number;
}

export interface TaxPlanDetailsAssistantRecommendationSource {
  stage?: string | null;
  owner?: string | null;
  priority?: string | null;
  verifiedName?: string | null;
  provider?: string | null;
}

export type TaxPlanDetailsAssistantQuestionValidation =
  | { isValid: true; question: string }
  | { isValid: false; message: string };

export const taxPlanDetailsAssistantQuestionMaxLength = 2_000;

const disallowedControlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;

function toRecommendationValue(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized ? normalized : "...";
}

export function buildTaxPlanDetailsAssistantRecommendation(
  source: TaxPlanDetailsAssistantRecommendationSource,
): string {
  return [
    `Tax Plan Cycle in ${toRecommendationValue(source.stage)} case owned by`,
    `${toRecommendationValue(source.owner)} with a ${toRecommendationValue(source.priority)}`,
    `priority for the taxpayer ${toRecommendationValue(source.verifiedName)} from`,
    toRecommendationValue(source.provider),
  ].join(" ");
}

export function validateTaxPlanDetailsAssistantQuestion(
  value: string,
): TaxPlanDetailsAssistantQuestionValidation {
  const question = value.trim();

  if (question.length === 0) {
    return { isValid: false, message: "Enter a question before sending." };
  }

  if (question.length > taxPlanDetailsAssistantQuestionMaxLength) {
    return {
      isValid: false,
      message: `Questions must be ${taxPlanDetailsAssistantQuestionMaxLength.toLocaleString()} characters or fewer.`,
    };
  }

  if (disallowedControlCharacters.test(question)) {
    return {
      isValid: false,
      message: "Remove unsupported control characters before sending.",
    };
  }

  return { isValid: true, question };
}

export async function postTaxPlanDetailsAssistant(
  caseId: string,
  request: TaxPlanDetailsAssistantRequest,
  fetcher?: typeof fetch,
): Promise<TaxPlanDetailsAssistantResponse> {
  return await caseApiPostJson<TaxPlanDetailsAssistantResponse>(
    `/v1/tax-plan-cycles/${caseId}/assist`,
    request,
    fetcher,
  );
}

export function useTaxPlanDetailsAssistantMutation() {
  const authenticatedFetch = useAuthenticatedFetch();

  return useMutation({
    mutationFn: ({ caseId, request }: { caseId: string; request: TaxPlanDetailsAssistantRequest }) =>
      postTaxPlanDetailsAssistant(caseId, request, authenticatedFetch),
  });
}

export function parseTaxPlanDetailsAssistantError(
  error: unknown,
): TaxPlanDetailsAssistantError {
  if (!(error instanceof CaseApiError)) {
    return {
      title: "Assistant request failed",
      detail:
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "The assistant request could not be completed.",
    };
  }

  const rawBody = error.body.trim();
  const fallbackDetail = `Assistant request failed with HTTP ${error.status}.`;
  if (rawBody.length === 0) {
    return {
      title: "Assistant request failed",
      detail: fallbackDetail,
      status: error.status,
    };
  }

  try {
    const parsed = JSON.parse(rawBody) as {
      title?: unknown;
      code?: unknown;
      message?: unknown;
      detail?: unknown;
    };
    const title =
      typeof parsed.title === "string" && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : typeof parsed.code === "string" && parsed.code.trim().length > 0
          ? parsed.code.trim()
          : "Assistant request failed";
    const detail =
      typeof parsed.message === "string" && parsed.message.trim().length > 0
        ? parsed.message.trim()
        : typeof parsed.detail === "string" && parsed.detail.trim().length > 0
          ? parsed.detail.trim()
          : fallbackDetail;

    return { title, detail, status: error.status };
  } catch {
    return {
      title: "Assistant request failed",
      detail: rawBody,
      status: error.status,
    };
  }
}
