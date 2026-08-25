import {
  CorpusValidationError,
  buildCorpusArtifactFromDirectory,
  defaultCorpusChunkArtifactPath,
  defaultCorpusInputDirectory,
  loadCorpusIntakeConfig,
} from "../../assist/corpus.js";

import { config as loadEnv } from "dotenv";

loadEnv({ override: true });

const inputDirectory = process.env.CORPUS_INPUT_DIR?.trim();
if (!inputDirectory) {
  throw new Error("CORPUS_INPUT_DIR is required");
}

const outputPath = process.env.CORPUS_CHUNKS_PATH?.trim();
if (!outputPath) {
  throw new Error("CORPUS_CHUNKS_PATH is required");
}

const configPath = process.env.CORPUS_INTAKE_CONFIG?.trim();
if (!configPath) {
  throw new Error("CORPUS_INTAKE_CONFIG is required");
}


try {
  const config = await loadCorpusIntakeConfig(configPath);
  const chunks = await buildCorpusArtifactFromDirectory(inputDirectory, outputPath, config);
  const byType = chunks.reduce<Record<string, number>>((counts, chunk) => {
    counts[chunk.documentType] = (counts[chunk.documentType] ?? 0) + 1;
    return counts;
  }, {});

  console.log(
    `PASS Built ${chunks.length} corpus chunk(s) at ${outputPath}. tax_code=${byType.tax_code ?? 0} playbook=${byType.playbook ?? 0}`,
  );
} catch (error: unknown) {
  if (error instanceof CorpusValidationError) {
    console.error("FAIL Corpus build stopped because validation failed:");
    for (const issue of error.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
  } else {
    throw error;
  }
}
