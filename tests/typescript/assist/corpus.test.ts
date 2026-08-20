import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  CorpusValidationError,
  buildCorpusArtifactFromDirectory,
  buildCorpusChunks,
  loadCorpusDocuments,
  loadCorpusIntakeConfig,
  parseCorpusDocument,
  retrieveCorpusChunksForSmoke,
  validateCorpusDocuments,
  writeCorpusChunkArtifact,
} from "../../../src/typescript/assist/corpus.js";

const corpusDirectory = "data/corpus";

describe("assist corpus intake", () => {
  test("loads the generated tax-code and playbook corpus with required metadata", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);

    expect(documents).toHaveLength(11);
    expect(documents.filter((document) => document.documentType === "tax_code")).toHaveLength(7);
    expect(documents.filter((document) => document.documentType === "playbook")).toHaveLength(4);
    expect(documents.every((document) => document.synthetic)).toBe(true);
    expect(documents.every((document) => document.inventedRatesAndLimits)).toBe(true);
    expect(documents.every((document) => document.tenantMetadata.tenant_id)).toBe(true);
  });

  test("validates configured corpus properties from the generated corpus intake config", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);
    const config = await loadCorpusIntakeConfig(path.join(corpusDirectory, "corpus-intake.json"));

    expect(() => validateCorpusDocuments(documents, config)).not.toThrow();
  });

  test("rejects a document missing tenant metadata", async () => {
    const document = parseCorpusDocument(
      "missing-tenant.md",
      `---
document_id: missing-tenant
document_type: tax_code
synthetic: true
fictional_issuer: Civic Ledger Training Authority
invented_rates_and_limits: true
---

# Missing Tenant

## SYN-TC-9999-a Missing metadata

Synthetic text.
`,
    );

    expect(() => validateCorpusDocuments([document], { expectedDocumentCount: { min: 1, max: 1 } }))
      .toThrow(CorpusValidationError);
  });

  test("rejects headings without stable section identifiers", () => {
    expect(() =>
      parseCorpusDocument(
        "bad-heading.md",
        `---
document_id: bad-heading
document_type: tax_code
synthetic: true
fictional_issuer: Civic Ledger Training Authority
invented_rates_and_limits: true
tenant:
  tenant_id: tenant-training-alpha
---

# Bad Heading

## Missing identifier

Synthetic text.
`,
      ),
    ).toThrow(CorpusValidationError);
  });

  test("rejects duplicate section identifiers across documents", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);
    const duplicate = {
      ...documents[0]!,
      filePath: "duplicate.md",
      documentId: "duplicate",
      sections: [{ ...documents[1]!.sections[0]!, id: documents[0]!.sections[0]!.id }],
    };

    expect(() =>
      validateCorpusDocuments([documents[0]!, duplicate], {
        expectedDocumentCount: { min: 2, max: 2 },
      }),
    ).toThrow(CorpusValidationError);
  });

  test("preserves citation metadata on every chunk", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);
    const chunks = buildCorpusChunks(documents, { maxChunkChars: 220, overlapChars: 40 });

    expect(chunks.length).toBeGreaterThan(44);
    expect(chunks.every((chunk) => chunk.citation.sectionId === chunk.sectionId)).toBe(true);
    expect(chunks.every((chunk) => chunk.citation.syntheticNotice.includes("Synthetic"))).toBe(true);
    expect(chunks.every((chunk) => chunk.sectionId.startsWith("SYN-"))).toBe(true);
  });

  test("creates deterministic chunk ids and ordering for unchanged input", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);
    const firstBuild = buildCorpusChunks(documents, { maxChunkChars: 220, overlapChars: 40 });
    const secondBuild = buildCorpusChunks(documents, { maxChunkChars: 220, overlapChars: 40 });

    expect(secondBuild.map((chunk) => chunk.chunkId)).toEqual(
      firstBuild.map((chunk) => chunk.chunkId),
    );
  });

  test("writes a valid chunk artifact from a corpus directory", async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), "taxpulse-corpus-"));
    const outputPath = path.join(outputDirectory, "chunks.jsonl");

    try {
      const config = await loadCorpusIntakeConfig(path.join(corpusDirectory, "corpus-intake.json"));
      const chunks = await buildCorpusArtifactFromDirectory(corpusDirectory, outputPath, config);
      const artifact = await readFile(outputPath, "utf8");

      expect(chunks).toHaveLength(45);
      expect(artifact.trim().split(/\r?\n/)).toHaveLength(chunks.length);
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });

  test("smoke retrieval returns the expected generated rule chunk first", async () => {
    const documents = await loadCorpusDocuments(corpusDirectory);
    const chunks = buildCorpusChunks(documents);
    const results = retrieveCorpusChunksForSmoke(
      chunks,
      "quarterly estimated payment review for dividend and self-employment income not subject to withholding",
    );

    expect(results[0]?.sectionId).toBe("SYN-TC-4100-b");
  });

  test("writes JSONL chunks for later embedding work without performing embeddings", async () => {
    const outputDirectory = await mkdtemp(path.join(tmpdir(), "taxpulse-corpus-"));
    const outputPath = path.join(outputDirectory, "chunks.jsonl");

    try {
      const documents = await loadCorpusDocuments(corpusDirectory);
      const chunks = buildCorpusChunks(documents);
      await writeCorpusChunkArtifact(chunks, outputPath);

      const artifact = await readFile(outputPath, "utf8");
      expect(artifact).toContain("\"sectionId\":\"SYN-TC-4100-b\"");
      expect(artifact).not.toContain("embedding");
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });
});
