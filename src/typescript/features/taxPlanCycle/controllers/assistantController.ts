import { z } from "zod";

import {
  type AssistExplanationProvider,
} from "../../../assist/explanation.js";
import {
  resolveAssistTenantCorpusScopes,
  type AssistTenantCorpusScope,
} from "../../../assist/tenantScopes.js";
import { detectAssistPromptInjection } from "../../../assist/promptSafety.js";
import type { RankedCorpusChunk } from "../../../assist/retrieval.js";

export const taxPlanDetailsAssistantRequestSchema = z.strictObject({
  recommendation_context: z.strictObject({
    recommendation: z.string().trim().min(1),
    question: z.string().trim().min(1).optional(),
  }),
});

const taxPlanDetailsAssistantCitationSchema = z.strictObject({
  chunk_id: z.string().trim().min(1),
  document_id: z.string().trim().min(1),
  document_title: z.string().trim().min(1),
  document_type: z.enum(["tax_code", "playbook"]),
  fictional_issuer: z.string().trim().min(1),
  section_id: z.string().trim().min(1),
  section_path: z.string().trim().min(1),
  synthetic_notice: z.string().trim().min(1),
});

export const taxPlanDetailsAssistantResponseSchema = z.strictObject({
  explanation: z.string().trim().min(1),
  citations: z.array(taxPlanDetailsAssistantCitationSchema).min(1),
});

export type TaxPlanDetailsAssistant = z.infer<
  typeof taxPlanDetailsAssistantRequestSchema
>;
export type TaxPlanDetailsAssistantResponse = z.infer<
  typeof taxPlanDetailsAssistantResponseSchema
>;

export class TaxPlanDetailsAssistantCaseNotFoundError extends Error {
  constructor(caseId: string) {
    super(`No tax plan cycle was found for case ${caseId}.`);
    this.name = "TaxPlanDetailsAssistantCaseNotFoundError";
  }
}

export class TaxPlanDetailsAssistantUnavailableError extends Error {
  constructor(message = "The assistant is not available.") {
    super(message);
    this.name = "TaxPlanDetailsAssistantUnavailableError";
  }
}

export class TaxPlanDetailsAssistantUnsupportedRecommendationError extends Error {
  constructor(message = "The recommendation context is not supported by tenant-scoped assist sources.") {
    super(message);
    this.name = "TaxPlanDetailsAssistantUnsupportedRecommendationError";
  }
}

export class TaxPlanDetailsAssistantUnsafePromptError extends Error {
  constructor(message = "The assistant request could not be processed safely.") {
    super(message);
    this.name = "TaxPlanDetailsAssistantUnsafePromptError";
  }
}

export interface CreateTaxPlanDetailsAssistantControllerOptions {
  taxPlanCycleRepository: {
    findByCaseId(input: { tenantId: string; caseId: string }): Promise<{ id: string } | null> | { id: string } | null;
  };
  tenantScopeMap: ReadonlyMap<string, AssistTenantCorpusScope>;
  retriever: {
    retrieve(input: {
      query: string;
      limit: number;
      tenantScopes: readonly AssistTenantCorpusScope[];
    }): Promise<readonly RankedCorpusChunk[]>;
  };
  explanationProvider: AssistExplanationProvider;
  resultLimit?: number;
  assistLogger?: Pick<Console, "info">;
}

export interface TaxPlanDetailsAssistantController {
  assist(
    input: {
      tenantId: string;
      actor: string;
      caseId: string;
      recommendation_context: TaxPlanDetailsAssistant["recommendation_context"];
    },
  ): Promise<TaxPlanDetailsAssistantResponse> | TaxPlanDetailsAssistantResponse;
}

export function createTaxPlanDetailsAssistantController(
  options: CreateTaxPlanDetailsAssistantControllerOptions,
): TaxPlanDetailsAssistantController {
  const resultLimit = Math.max(1, Math.floor(options.resultLimit ?? 5));

  return {
    async assist(input) {
      const cycle = await options.taxPlanCycleRepository.findByCaseId({
        tenantId: input.tenantId,
        caseId: input.caseId,
      });
      if (cycle === null) {
        throw new TaxPlanDetailsAssistantCaseNotFoundError(input.caseId);
      }

      const tenantScopes = resolveAssistTenantCorpusScopes(options.tenantScopeMap, input.tenantId);
      const recommendation = input.recommendation_context.recommendation.trim();
      const question = input.recommendation_context.question?.trim();
      const promptSafetyResult = detectAssistPromptInjection({
        recommendation,
        question,
      });

      if (!promptSafetyResult.safe) {
        throw new TaxPlanDetailsAssistantUnsafePromptError();
      }

      const retrievalQuery = question || recommendation;

      const chunks = await options.retriever.retrieve({
        query: retrievalQuery,
        limit: resultLimit,
        tenantScopes,
      });
      if (chunks.length === 0) {
        options.assistLogger?.info({
          event: "tax_plan_cycle_assist_retrieval_empty",
          tenant_scopes: tenantScopes,
          result_limit: resultLimit,
        });
        throw new TaxPlanDetailsAssistantUnavailableError("No grounded assist context was available.");
      }

      validateRetrievedChunkScopes(chunks, tenantScopes);

      const supportedChunks = selectRecommendationSupportedChunks(recommendation, chunks);
      if (supportedChunks.length === 0) {
        throw new TaxPlanDetailsAssistantUnsupportedRecommendationError();
      }

      const explanation = await options.explanationProvider.explain({
        recommendation,
        question,
        chunks: supportedChunks,
      });

      const citations = explanation.citedChunkIds.map((chunkId) => {
        const chunk = supportedChunks.find((candidate) => candidate.chunkId === chunkId);
        if (!chunk) {
          throw new TaxPlanDetailsAssistantUnavailableError(
            `Assistant cited a chunk that was not retrieved: ${chunkId}.`,
          );
        }

        return {
          chunk_id: chunk.chunkId,
          document_id: chunk.documentId,
          document_title: chunk.citation.documentTitle,
          document_type: chunk.documentType,
          fictional_issuer: chunk.citation.fictionalIssuer,
          section_id: chunk.sectionId,
          section_path: chunk.sectionPath,
          synthetic_notice: chunk.citation.syntheticNotice,
        };
      });

      return taxPlanDetailsAssistantResponseSchema.parse({
        explanation: explanation.explanation,
        citations,
      });
    },
  };
}

function validateRetrievedChunkScopes(
  chunks: readonly RankedCorpusChunk[],
  tenantScopes: readonly AssistTenantCorpusScope[],
): void {
  const allowedScopes = new Set(tenantScopes);

  for (const chunk of chunks) {
    if (!allowedScopes.has(chunk.citation.tenantId as AssistTenantCorpusScope)) {
      throw new TaxPlanDetailsAssistantUnavailableError("The assistant is not available.");
    }
  }
}

export const taxPlanDetailsAssistantController: TaxPlanDetailsAssistantController = {
  async assist() {
    throw new TaxPlanDetailsAssistantUnavailableError();
  },
};

function selectRecommendationSupportedChunks(
  recommendation: string,
  chunks: readonly RankedCorpusChunk[],
): RankedCorpusChunk[] {
  const supportTokens = tokenizeRecommendationSupport(recommendation);
  if (supportTokens.size === 0) {
    return [...chunks];
  }

  return chunks
    .map((chunk) => ({
      chunk,
      supportScore: scoreRecommendationSupport(supportTokens, chunk),
    }))
    .filter((candidate) => candidate.supportScore > 0)
    .sort((left, right) => {
      if (right.supportScore !== left.supportScore) {
        return right.supportScore - left.supportScore;
      }
      if (right.chunk.rerankScore !== left.chunk.rerankScore) {
        return right.chunk.rerankScore - left.chunk.rerankScore;
      }
      return left.chunk.chunkId.localeCompare(right.chunk.chunkId);
    })
    .map((candidate) => candidate.chunk);
}

function scoreRecommendationSupport(
  supportTokens: ReadonlySet<string>,
  chunk: RankedCorpusChunk,
): number {
  const textTokens = tokenizeText(chunk.text);
  const pathTokens = tokenizeText(chunk.sectionPath);
  const titleTokens = tokenizeText(chunk.citation.documentTitle);

  let score = 0;
  for (const token of supportTokens) {
    if (textTokens.has(token)) {
      score += 1;
    }
    if (pathTokens.has(token)) {
      score += 2;
    }
    if (titleTokens.has(token)) {
      score += 2;
    }
  }

  return score;
}

function tokenizeRecommendationSupport(text: string): Set<string> {
  const genericPromptWords = new Set([
    "about",
    "advise",
    "advisor",
    "apply",
    "basis",
    "best",
    "carefully",
    "cite",
    "client",
    "confirm",
    "context",
    "detail",
    "details",
    "evaluate",
    "explain",
    "guidance",
    "help",
    "justify",
    "plan",
    "recommended",
    "recommendation",
    "recommend",
    "review",
    "should",
    "source",
    "support",
    "what",
    "why",
  ]);

  return new Set(
    Array.from(tokenizeText(text)).filter((token) => !genericPromptWords.has(token) && !/^\d+$/.test(token)),
  );
}

function tokenizeText(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2) ?? [],
  );
}
