import { z } from "zod";

import {
  type AssistExplanationProvider,
} from "../../../assist/explanation.js";
import {
  resolveAssistTenantCorpusScopes,
  type AssistTenantCorpusScope,
} from "../../../assist/tenantScopes.js";
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
      const retrievalQuery = [recommendation, question].filter(Boolean).join("\n\n");

      const chunks = await options.retriever.retrieve({
        query: retrievalQuery,
        limit: resultLimit,
        tenantScopes,
      });
      if (chunks.length === 0) {
        throw new TaxPlanDetailsAssistantUnavailableError("No grounded assist context was available.");
      }

      const explanation = await options.explanationProvider.explain({
        recommendation,
        question,
        chunks,
      });

      const citations = explanation.citedChunkIds.map((chunkId) => {
        const chunk = chunks.find((candidate) => candidate.chunkId === chunkId);
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

export const taxPlanDetailsAssistantController: TaxPlanDetailsAssistantController = {
  async assist() {
    throw new TaxPlanDetailsAssistantUnavailableError();
  },
};
