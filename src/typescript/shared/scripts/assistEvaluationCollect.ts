import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";

import {
  createAssistRetrieverFactory,
  defaultAssistEvaluationArtifactsDirectory,
  defaultAssistEvaluationQuestionsPath,
  defaultAssistEvaluationThresholdsPath,
  loadEvaluationQuestions,
  loadEvaluationThresholds,
  writeJsonArtifact,
} from "../../assist/evaluation.js";
import { createOpenAIEmbeddingProvider } from "../../assist/embeddings.js";

loadEnv();

const questionsPath = process.env.ASSIST_EVALUATION_QUESTIONS_PATH?.trim() || defaultAssistEvaluationQuestionsPath;
const thresholdsPath = process.env.ASSIST_EVALUATION_THRESHOLDS_PATH?.trim() || defaultAssistEvaluationThresholdsPath;
const outputPath = process.env.ASSIST_RAGAS_INPUT_PATH?.trim() || `${defaultAssistEvaluationArtifactsDirectory}/ragas-input.json`;
const resultLimit = Number(process.env.ASSIST_EVALUATION_RESULT_LIMIT?.trim() || "5");
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for assist evaluation collection.");
}

if (!process.env.OPENAI_API_KEY?.trim()) {
  throw new Error("OPENAI_API_KEY is required for assist evaluation collection.");
}

const questions = await loadEvaluationQuestions(questionsPath);
const thresholds = await loadEvaluationThresholds(thresholdsPath);
const client = new Client({ connectionString: databaseUrl });
const embeddingProvider = createOpenAIEmbeddingProvider();

const samples = [];

await client.connect();

try {
  const retriever = createAssistRetrieverFactory({
    db: drizzle(client) as never,
    embeddingProvider,
    resultLimit,
  }).create();

  for (const question of questions) {
    const retrievedChunks = await retriever.retrieve(question.question, resultLimit);
    samples.push({
      id: question.id,
      userInput: question.question,
      response: question.response,
      retrievedContexts: retrievedChunks.map((chunk) => chunk.text),
      retrievedChunks,
      citations: retrievedChunks.map((chunk) => chunk.citation),
      expectedSectionIds: question.expectedSectionIds,
      syntheticNotice: question.syntheticNotice,
    });
  }

  await writeJsonArtifact(outputPath, {
    generatedAt: new Date().toISOString(),
    questions,
    thresholds,
    samples,
  });

  console.log(`PASS Wrote ${samples.length} collected sample(s) to ${outputPath}.`);
} finally {
  await client.end();
}
