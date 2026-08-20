import {
  CorpusValidationError,
  buildCorpusArtifactFromDirectory,
  defaultCorpusChunkArtifactPath,
  defaultCorpusInputDirectory,
  loadCorpusIntakeConfig,
} from "../../assist/corpus.js";

const inputDirectory = process.env.CORPUS_INPUT_DIR?.trim() || defaultCorpusInputDirectory;
const outputPath = process.env.CORPUS_CHUNKS_PATH?.trim() || defaultCorpusChunkArtifactPath;
const configPath = process.env.CORPUS_INTAKE_CONFIG?.trim() || `${inputDirectory}/corpus-intake.json`;

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
