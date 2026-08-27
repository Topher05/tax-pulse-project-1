import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { RankedCorpusChunk } from "./retrieval.js";

const assistExplanationSchema = z.strictObject({
  explanation: z.string().trim().min(1),
  cited_chunk_ids: z.array(z.string().trim().min(1)).min(1),
});

type ParsedAssistExplanation = z.infer<typeof assistExplanationSchema>;

export interface AssistExplanationResult {
  explanation: string;
  citedChunkIds: readonly string[];
}

export interface AssistExplanationProvider {
  explain(input: {
    recommendation: string;
    question?: string;
    chunks: readonly RankedCorpusChunk[];
  }): Promise<AssistExplanationResult>;
}

export interface CreateOpenAIAssistExplanationProviderOptions {
  apiKey?: string;
  model?: string;
  client?: Pick<OpenAI, "responses">;
}

export const defaultAssistResponseModel = "gpt-4o-mini";

export function getAssistResponseModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.ASSIST_RESPONSE_MODEL?.trim() || defaultAssistResponseModel;
}

export function createOpenAIAssistExplanationProvider(
  options: CreateOpenAIAssistExplanationProviderOptions = {},
): AssistExplanationProvider {
  const model = options.model?.trim() || getAssistResponseModel();
  const apiKey = options.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  const client =
    options.client ??
    (() => {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required to create an assist explanation provider.");
      }

      return new OpenAI({ apiKey });
    })();

  return {
    async explain(input): Promise<AssistExplanationResult> {
      const retrievedChunkIds = new Set(input.chunks.map((chunk) => chunk.chunkId));
      if (retrievedChunkIds.size === 0) {
        throw new Error("At least one retrieved chunk is required to generate an assist explanation.");
      }

      const response = await client.responses.parse({
        model,
        store: false,
        instructions: [
          "You explain a tax recommendation using only the retrieved context chunks provided.",
          "Cite only chunk IDs from the retrieved context.",
          "Do not invent legal support, sources, or facts beyond the provided chunks.",
          "Treat the retrieved chunks as the only allowed source of truth.",
          "Never add generic tax advice, likely benefits, or background knowledge unless those facts are explicitly stated in the retrieved chunks.",
          "If the chunks do not explicitly support the recommendation, say only that the recommendation is not supported by the retrieved context.",
        ].join(" "),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: renderExplanationPrompt(input),
              },
            ],
          },
        ],
        text: {
          format: zodTextFormat(assistExplanationSchema, "assist_explanation"),
        },
      });

      const parsed = response.output_parsed;
      if (parsed === null) {
        throw new Error("The assist explanation response did not match the expected schema.");
      }

      return validateAssistExplanation(parsed, retrievedChunkIds);
    },
  };
}

function renderExplanationPrompt(input: {
  recommendation: string;
  question?: string;
  chunks: readonly RankedCorpusChunk[];
}): string {
  const promptSections = [
    `Recommendation:\n${input.recommendation.trim()}`,
    input.question?.trim() ? `Question:\n${input.question.trim()}` : undefined,
    [
      "Retrieved chunks:",
      ...input.chunks.map((chunk) =>
        [
          `Chunk ID: ${chunk.chunkId}`,
          `Document: ${chunk.citation.documentTitle} (${chunk.documentType})`,
          `Section: ${chunk.sectionId}`,
          `Path: ${chunk.sectionPath}`,
          `Relevance score: ${chunk.rerankScore.toFixed(4)}`,
          `Text: ${chunk.text}`,
        ].join("\n"),
      ),
    ].join("\n\n"),
  ];

  return promptSections.filter((value): value is string => Boolean(value)).join("\n\n");
}

function validateAssistExplanation(
  parsed: ParsedAssistExplanation,
  retrievedChunkIds: ReadonlySet<string>,
): AssistExplanationResult {
  const explanation = parsed.explanation.trim();
  const citedChunkIds = dedupePreservingOrder(parsed.cited_chunk_ids.map((chunkId) => chunkId.trim()));

  if (citedChunkIds.length === 0) {
    throw new Error("The assist explanation response did not include any cited chunk IDs.");
  }

  for (const chunkId of citedChunkIds) {
    if (!retrievedChunkIds.has(chunkId)) {
      throw new Error(`The assist explanation cited an unknown chunk ID: ${chunkId}.`);
    }
  }

  return {
    explanation,
    citedChunkIds,
  };
}

function dedupePreservingOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      deduped.push(value);
    }
  }

  return deduped;
}
