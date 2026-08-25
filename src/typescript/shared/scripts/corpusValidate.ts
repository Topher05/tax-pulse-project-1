import {
  CorpusValidationError,
  defaultCorpusInputDirectory,
  loadCorpusIntakeConfig,
  validateCorpusDirectory,
} from "../../assist/corpus.js";

import { config as loadEnv } from "dotenv";

loadEnv();

const inputDirectory = process.env.CORPUS_INPUT_DIR?.trim();
if (!inputDirectory) {
  throw new Error("CORPUS_INPUT_DIR is required");
}

const configPath = process.env.CORPUS_INTAKE_CONFIG?.trim();
if (!configPath) {
  throw new Error("CORPUS_INTAKE_CONFIG is required");
}

try {
  const config = await loadCorpusIntakeConfig(configPath);
  const documents = await validateCorpusDirectory(inputDirectory, config);
  const sectionCount = documents.reduce((sum, document) => sum + document.sections.length, 0);

  console.log(
    `PASS Corpus validation passed for ${documents.length} document(s) and ${sectionCount} section(s).`,
  );
} catch (error: unknown) {
  if (error instanceof CorpusValidationError) {
    console.error("FAIL Corpus validation failed:");
    for (const issue of error.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
  } else {
    throw error;
  }
}
