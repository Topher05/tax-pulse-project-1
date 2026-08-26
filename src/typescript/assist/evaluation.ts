import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { createOpenAIEmbeddingProvider } from "./embeddings.js";
import {
  defaultReranker,
  retrieveHybridCorpusChunks,
  type Reranker,
} from "./retrieval.js";

export const defaultAssistEvaluationDirectory = "data/corpus/evaluation";
export const defaultAssistEvaluationArtifactsDirectory = "artifacts/assist-evaluation";
export const defaultAssistEvaluationQuestionsPath = path.join(
  defaultAssistEvaluationDirectory,
  "questions.json",
);
export const defaultAssistEvaluationThresholdsPath = path.join(
  defaultAssistEvaluationDirectory,
  "thresholds.json",
);
export const defaultRagasInputArtifactPath = path.join(
  defaultAssistEvaluationArtifactsDirectory,
  "ragas-input.json",
);
export const defaultRagasReportArtifactPath = path.join(
  defaultAssistEvaluationArtifactsDirectory,
  "ragas-report.json",
);

export interface EvaluationQuestion {
  id: string;
  question: string;
  response: string;
  expectedSectionIds: string[];
  syntheticNotice: string;
}

export interface EvaluationThreshold {
  name: string;
  minimumMean: number;
}

export interface EvaluationThresholdSet {
  metrics: EvaluationThreshold[];
}

export interface RetrievedCitation {
  documentTitle: string;
  documentType: string;
  fictionalIssuer: string;
  tenantId: string;
  sectionId: string;
  sectionPath: string;
  syntheticNotice: string;
}

export interface RetrievedRankedChunk {
  rank: number;
  chunkId: string;
  documentId: string;
  documentType: string;
  sectionId: string;
  sectionPath: string;
  text: string;
  citation: RetrievedCitation;
  score?: number;
}

export interface AssistRetriever {
  retrieve(question: string, resultLimit: number): Promise<RetrievedRankedChunk[]>;
}

export interface AssistRetrieverFactory {
  create(): AssistRetriever;
}

export interface AssistRetrieverFactoryOptions {
  db: NodePgDatabase<Record<string, unknown>>;
  embeddingProvider?: ReturnType<typeof createOpenAIEmbeddingProvider>;
  reranker?: Reranker;
  resultLimit?: number;
}

export interface RagasInputSample {
  id: string;
  userInput: string;
  response: string;
  retrievedContexts: string[];
  retrievedChunks: RetrievedRankedChunk[];
  citations: RetrievedCitation[];
}

export interface RagasInputArtifact {
  generatedAt: string;
  questions: EvaluationQuestion[];
  samples: RagasInputSample[];
}

export interface MetricScore {
  value: number;
  reason?: string;
}

export interface RagasQuestionScore {
  id: string;
  contextRelevance: MetricScore;
  faithfulness: MetricScore;
  retrievedChunkIds: string[];
  citations: RetrievedCitation[];
}

export interface RagasReportArtifact {
  generatedAt: string;
  evaluator: {
    model: string;
    temperature: number;
  };
  thresholds: EvaluationThresholdSet;
  questionCount: number;
  questions: RagasQuestionScore[];
  aggregate: {
    contextRelevance: number;
    faithfulness: number;
  };
  pass: boolean;
}

export function createAssistRetrieverFactory(
  options: AssistRetrieverFactoryOptions,
): AssistRetrieverFactory {
  const embeddingProvider = options.embeddingProvider ?? createOpenAIEmbeddingProvider();
  const reranker = options.reranker ?? defaultReranker();
  const defaultLimit = Math.max(1, Math.floor(options.resultLimit ?? 5));

  return {
    create(): AssistRetriever {
      return {
        async retrieve(question: string, resultLimit: number): Promise<RetrievedRankedChunk[]> {
          const chunks = await retrieveHybridCorpusChunks(
            options.db,
            question,
            { limit: Math.max(1, Math.floor(resultLimit || defaultLimit)) },
            embeddingProvider,
            reranker,
          );

          return chunks.map((chunk, index) => ({
            rank: index + 1,
            chunkId: chunk.chunkId,
            documentId: chunk.documentId,
            documentType: chunk.documentType,
            sectionId: chunk.sectionId,
            sectionPath: chunk.sectionPath,
            text: chunk.text,
            citation: chunk.citation,
            score: chunk.rerankScore,
          }));
        },
      };
    },
  };
}

export async function loadEvaluationQuestions(
  questionsPath = defaultAssistEvaluationQuestionsPath,
): Promise<EvaluationQuestion[]> {
  const raw = JSON.parse(await readFile(questionsPath, "utf8")) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error(`Expected ${questionsPath} to contain a JSON array of questions.`);
  }

  const questions = raw.map((item, index) =>
    validateQuestion(item, `${questionsPath}[${index}]`),
  );
  assertUniqueNames(
    questions.map((question) => question.id),
    `${questionsPath} question IDs`,
  );
  return questions;
}

export async function loadEvaluationThresholds(
  thresholdsPath = defaultAssistEvaluationThresholdsPath,
): Promise<EvaluationThresholdSet> {
  const raw = JSON.parse(await readFile(thresholdsPath, "utf8")) as unknown;
  if (!isRecord(raw) || !Array.isArray(raw.metrics)) {
    throw new Error(`Expected ${thresholdsPath} to contain { metrics: [...] }.`);
  }

  const metrics = raw.metrics.map((metric, index) =>
    validateThreshold(metric, `${thresholdsPath}.metrics[${index}]`),
  );
  assertUniqueNames(
    metrics.map((metric) => metric.name),
    `${thresholdsPath} metric names`,
  );

  const requiredMetrics = ["context_relevance", "faithfulness"];
  for (const requiredMetric of requiredMetrics) {
    if (!metrics.some((metric) => metric.name === requiredMetric)) {
      throw new Error(`${thresholdsPath} must define ${requiredMetric}.`);
    }
  }

  return { metrics };
}

export async function writeJsonArtifact(
  artifactPath: string,
  payload: unknown,
): Promise<void> {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function validateQuestion(value: unknown, label: string): EvaluationQuestion {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  if (!Array.isArray(value.expectedSectionIds) || value.expectedSectionIds.length === 0) {
    throw new Error(`${label}.expectedSectionIds must be a non-empty string array.`);
  }
  const expectedSectionIds = value.expectedSectionIds.map((item, index) =>
    requireString(item, `${label}.expectedSectionIds[${index}]`),
  );

  return {
    id: requireString(value.id, `${label}.id`),
    question: requireString(value.question, `${label}.question`),
    response: requireString(value.response, `${label}.response`),
    expectedSectionIds,
    syntheticNotice: requireString(value.syntheticNotice, `${label}.syntheticNotice`),
  };
}

function validateThreshold(value: unknown, label: string): EvaluationThreshold {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  const minimumMean = Number(value.minimumMean);
  if (!Number.isFinite(minimumMean) || minimumMean < 0 || minimumMean > 1) {
    throw new Error(`${label}.minimumMean must be a finite number between 0 and 1.`);
  }

  return {
    name: requireString(value.name, `${label}.name`),
    minimumMean,
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function assertUniqueNames(values: readonly string[], label: string): void {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) {
    throw new Error(`${label} must be unique; duplicate ${duplicate}.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
