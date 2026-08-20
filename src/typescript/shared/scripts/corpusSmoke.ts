import {
  defaultCorpusChunkArtifactPath,
  readCorpusChunkArtifact,
  retrieveCorpusChunksForSmoke,
} from "../../assist/corpus.js";

const chunksPath = process.env.CORPUS_CHUNKS_PATH?.trim() || defaultCorpusChunkArtifactPath;
const query =
  process.env.CORPUS_SMOKE_QUERY?.trim() ||
  "quarterly estimated payment review for dividend and self-employment income not subject to withholding";
const expectedSectionId =
  process.env.CORPUS_SMOKE_EXPECTED_SECTION_ID?.trim() || "SYN-TC-4100-b";

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
