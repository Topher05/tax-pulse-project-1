import {
  defaultCorpusChunkArtifactPath,
  readCorpusChunkArtifact,
  retrieveCorpusChunksForSmoke,
} from "../../assist/corpus.js";

import { config as loadEnv } from "dotenv";

loadEnv();

const chunksPath = process.env.CORPUS_CHUNKS_PATH?.trim();
if (!chunksPath) {
  throw new Error("CORPUS_CHUNKS_PATH is required");
}

const query = process.env.CORPUS_SMOKE_QUERY?.trim();
if (!query) {
  throw new Error("CORPUS_SMOKE_QUERY is required");
}

const expectedSectionId = process.env.CORPUS_SMOKE_EXPECTED_SECTION_ID?.trim();
if (!expectedSectionId) {
  throw new Error("CORPUS_SMOKE_EXPECTED_SECTION_ID is required");
}

const chunks = await readCorpusChunkArtifact(chunksPath);
const results = retrieveCorpusChunksForSmoke(chunks, query, 3);
const topResult = results[0];

if (!topResult) {
  console.error(`FAIL Corpus smoke returned no chunks for query: ${query}`);
  process.exitCode = 1;
} else if (expectedSectionId && topResult.sectionId !== expectedSectionId) {
  console.error(
    `FAIL Corpus smoke expected ${expectedSectionId} first, received ${topResult.sectionId}.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `PASS Corpus smoke returned ${topResult.sectionId} first from ${topResult.citation.documentTitle}.`,
  );
}
