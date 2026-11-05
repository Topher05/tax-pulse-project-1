import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const defaultCorpusInputDirectory = "data/corpus";
export const defaultCorpusChunkArtifactPath = "data/corpus/build/chunks.jsonl";

export type CorpusDocumentType = "tax_code" | "playbook";

export interface CorpusCitation {
  documentTitle: string;
  documentType: CorpusDocumentType;
  fictionalIssuer: string;
  tenantId: string;
  sectionId: string;
  sectionPath: string;
  syntheticNotice: string;
}

export interface CorpusSection {
  id: string;
  heading: string;
  level: number;
  path: string;
  text: string;
  line: number;
  hasThresholdTable: boolean;
}

export interface CorpusDocument {
  filePath: string;
  documentId: string;
  title: string;
  documentType: CorpusDocumentType;
  synthetic: boolean;
  fictionalIssuer: string;
  inventedRatesAndLimits: boolean;
  tenantMetadata: Record<string, string>;
  sections: CorpusSection[];
}

export interface CorpusChunk {
  chunkId: string;
  documentId: string;
  documentType: CorpusDocumentType;
  sectionId: string;
  sectionPath: string;
  citation: CorpusCitation;
  text: string;
  ordinal: number;
  contentHash: string;
}

export interface CorpusIntakeConfig {
  expectedDocumentCount?: {
    min: number;
    max: number;
  };
  expectedThresholdSectionIds?: string[];
  expectedNearDuplicatePairs?: Array<{
    leftSectionId: string;
    rightSectionId: string;
    materialDifference: string;
  }>;
  expectedSupersededPairs?: Array<{
    supersededSectionId: string;
    replacementSectionId: string;
    effectiveDate: string;
  }>;
}

export interface CorpusBuildOptions {
  maxChunkChars?: number;
  overlapChars?: number;
}

export class CorpusValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Corpus validation failed with ${issues.length} issue(s).`);
    this.name = "CorpusValidationError";
    this.issues = issues;
  }
}

const frontMatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const sectionIdentifierPattern = /\bSYN-(?:TC|PB)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/;
const headingPattern = /^(#{1,6})\s+(.+)$/gm;

export async function loadCorpusDocuments(
  inputDirectory = defaultCorpusInputDirectory,
): Promise<CorpusDocument[]> {
  const markdownPaths = await listCorpusMarkdownFiles(inputDirectory);

  return await Promise.all(
    markdownPaths.map(async (filePath) => parseCorpusDocument(filePath, await readFile(filePath, "utf8"))),
  );
}

export async function loadCorpusIntakeConfig(
  configPath: string,
): Promise<CorpusIntakeConfig | undefined> {
  try {
    const configText = await readFile(configPath, "utf8");
    return JSON.parse(configText) as CorpusIntakeConfig;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export async function validateCorpusDirectory(
  inputDirectory = defaultCorpusInputDirectory,
  config?: CorpusIntakeConfig,
): Promise<CorpusDocument[]> {
  const documents = await loadCorpusDocuments(inputDirectory);
  validateCorpusDocuments(documents, config);
  return documents;
}

export function validateCorpusDocuments(
  documents: CorpusDocument[],
  config: CorpusIntakeConfig = {},
): void {
  const issues: string[] = [];
  const expectedCount = config.expectedDocumentCount ?? { min: 10, max: 12 };

  if (documents.length < expectedCount.min || documents.length > expectedCount.max) {
    issues.push(
      `corpus: expected ${expectedCount.min}-${expectedCount.max} markdown document(s), found ${documents.length}.`,
    );
  }

  const sectionIds = new Map<string, string>();
  const thresholdSectionIds = new Set<string>();

  for (const document of documents) {
    const label = path.relative(process.cwd(), document.filePath);

    if (!document.documentId) {
      issues.push(`${label}: front matter is missing document_id.`);
    }
    if (!document.title) {
      issues.push(`${label}: document is missing a level-1 title.`);
    }
    if (document.synthetic !== true) {
      issues.push(`${label}: front matter must mark synthetic: true.`);
    }
    if (!document.fictionalIssuer) {
      issues.push(`${label}: front matter is missing fictional_issuer.`);
    }
    if (document.inventedRatesAndLimits !== true) {
      issues.push(`${label}: front matter must mark invented_rates_and_limits: true.`);
    }
    if (Object.keys(document.tenantMetadata).length === 0) {
      issues.push(`${label}: front matter is missing tenant metadata.`);
    }
    if (document.sections.length === 0) {
      issues.push(`${label}: document has no section or subsection headings.`);
    }

    for (const section of document.sections) {
      if (sectionIds.has(section.id)) {
        issues.push(
          `${label}:${section.line}: section identifier ${section.id} duplicates ${sectionIds.get(section.id)}.`,
        );
      } else {
        sectionIds.set(section.id, `${label}:${section.line}`);
      }

      if (section.hasThresholdTable) {
        thresholdSectionIds.add(section.id);
      }
    }
  }

  for (const expectedSectionId of config.expectedThresholdSectionIds ?? []) {
    if (!thresholdSectionIds.has(expectedSectionId)) {
      issues.push(`corpus: expected threshold table section ${expectedSectionId} was not found.`);
    }
  }

  for (const pair of config.expectedNearDuplicatePairs ?? []) {
    if (!sectionIds.has(pair.leftSectionId) || !sectionIds.has(pair.rightSectionId)) {
      issues.push(
        `corpus: near-duplicate pair ${pair.leftSectionId}/${pair.rightSectionId} (${pair.materialDifference}) is incomplete.`,
      );
    }
  }

  for (const pair of config.expectedSupersededPairs ?? []) {
    if (!sectionIds.has(pair.supersededSectionId) || !sectionIds.has(pair.replacementSectionId)) {
      issues.push(
        `corpus: superseded/replacement pair ${pair.supersededSectionId}/${pair.replacementSectionId} effective ${pair.effectiveDate} is incomplete.`,
      );
    }
  }

  if (issues.length > 0) {
    throw new CorpusValidationError(issues);
  }
}

export function parseCorpusDocument(filePath: string, markdown: string): CorpusDocument {
  const frontMatterMatch = markdown.match(frontMatterPattern);
  const frontMatter = parseFrontMatter(frontMatterMatch?.[1] ?? "");
  const content = frontMatterMatch ? markdown.slice(frontMatterMatch[0].length) : markdown;
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const sections = parseCorpusSections(content, filePath);

  return {
    filePath,
    documentId: asString(frontMatter.document_id),
    title: titleMatch?.[1]?.trim() ?? asString(frontMatter.title),
    documentType: asDocumentType(frontMatter.document_type),
    synthetic: asBoolean(frontMatter.synthetic),
    fictionalIssuer: asString(frontMatter.fictional_issuer),
    inventedRatesAndLimits: asBoolean(frontMatter.invented_rates_and_limits),
    tenantMetadata: asStringRecord(frontMatter.tenant),
    sections,
  };
}

export function buildCorpusChunks(
  documents: CorpusDocument[],
  options: CorpusBuildOptions = {},
): CorpusChunk[] {
  const maxChunkChars = options.maxChunkChars ?? 1_000;
  const overlapChars = options.overlapChars ?? 150;
  const chunks: CorpusChunk[] = [];

  for (const document of documents) {
    for (const section of document.sections) {
      const textChunks = splitSectionText(section.text, maxChunkChars, overlapChars);

      textChunks.forEach((text, index) => {
        const contentHash = hashText(text);
        const ordinal = index + 1;
        chunks.push({
          chunkId: [
            document.documentId,
            section.id,
            String(ordinal).padStart(3, "0"),
            contentHash.slice(0, 12),
          ].join(":"),
          documentId: document.documentId,
          documentType: document.documentType,
          sectionId: section.id,
          sectionPath: section.path,
          citation: {
            documentTitle: document.title,
            documentType: document.documentType,
            fictionalIssuer: document.fictionalIssuer,
            tenantId: document.tenantMetadata.tenant_id ?? document.tenantMetadata.tenantId ?? "unknown",
            sectionId: section.id,
            sectionPath: section.path,
            syntheticNotice: "Synthetic training content; rates and limits are invented.",
          },
          text,
          ordinal,
          contentHash,
        });
      });
    }
  }

  return chunks;
}

export async function writeCorpusChunkArtifact(
  chunks: CorpusChunk[],
  outputPath = defaultCorpusChunkArtifactPath,
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const lines = chunks.map((chunk) => JSON.stringify(chunk)).join("\n");
  await writeFile(outputPath, `${lines}\n`, "utf8");
}

export async function readCorpusChunkArtifact(
  artifactPath = defaultCorpusChunkArtifactPath,
): Promise<CorpusChunk[]> {
  const artifact = await readFile(artifactPath, "utf8");
  return artifact
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as CorpusChunk);
}

export function retrieveCorpusChunksForSmoke(
  chunks: CorpusChunk[],
  query: string,
  limit = 3,
): CorpusChunk[] {
  const queryTokens = tokenize(query);

  return chunks
    .map((chunk) => ({
      chunk,
      score:
        scoreTokens(queryTokens, tokenize(chunk.text)) +
        scoreTokens(queryTokens, tokenize(chunk.sectionPath)) * 2 +
        scoreTokens(queryTokens, tokenize(chunk.citation.documentTitle)) * 2,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.chunk.chunkId.localeCompare(right.chunk.chunkId);
    })
    .slice(0, limit)
    .map((candidate) => candidate.chunk);
}

export async function buildCorpusArtifactFromDirectory(
  inputDirectory = defaultCorpusInputDirectory,
  outputPath = defaultCorpusChunkArtifactPath,
  config?: CorpusIntakeConfig,
): Promise<CorpusChunk[]> {
  const documents = await validateCorpusDirectory(inputDirectory, config);
  const chunks = buildCorpusChunks(documents);
  await writeCorpusChunkArtifact(chunks, outputPath);
  return chunks;
}

async function listCorpusMarkdownFiles(inputDirectory: string): Promise<string[]> {
  let entries: string[];

  try {
    entries = await readdir(inputDirectory);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const markdownPaths = await Promise.all(
    entries
      .filter((entry) => entry.toLowerCase().endsWith(".md"))
      .filter((entry) => !["readme.md", "corpus-spec.md"].includes(entry.toLowerCase()))
      .map(async (entry) => {
        const filePath = path.join(inputDirectory, entry);
        const fileStat = await stat(filePath);
        return fileStat.isFile() ? filePath : undefined;
      }),
  );

  return markdownPaths
    .filter((filePath): filePath is string => filePath !== undefined)
    .sort((left, right) => left.localeCompare(right));
}

function parseCorpusSections(content: string, filePath: string): CorpusSection[] {
  const matches = Array.from(content.matchAll(headingPattern));
  const sections: CorpusSection[] = [];
  const headingStack: Array<{ level: number; title: string }> = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (!match) {
      continue;
    }

    const marker = match[1] ?? "";
    const heading = match[2]?.trim() ?? "";
    const level = marker.length;

    if (level === 1) {
      headingStack.length = 0;
      headingStack.push({ level, title: heading });
      continue;
    }

    const identifier = heading.match(sectionIdentifierPattern)?.[0];
    if (!identifier) {
      throw new CorpusValidationError([
        `${path.relative(process.cwd(), filePath)}:${lineNumberAt(content, match.index ?? 0)}: heading is missing a stable synthetic TC/PB section identifier.`,
      ]);
    }

    while (headingStack.length > 0 && headingStack[headingStack.length - 1]!.level >= level) {
      headingStack.pop();
    }
    headingStack.push({ level, title: heading });

    const bodyStart = (match.index ?? 0) + match[0].length;
    const nextMatch = matches[index + 1];
    const bodyEnd = nextMatch?.index ?? content.length;
    const body = normalizeText(content.slice(bodyStart, bodyEnd));

    sections.push({
      id: identifier,
      heading,
      level,
      path: headingStack.map((entry) => entry.title).join(" > "),
      text: body,
      line: lineNumberAt(content, match.index ?? 0),
      hasThresholdTable: hasThresholdTable(body),
    });
  }

  return sections;
}

function parseFrontMatter(frontMatter: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let activeObjectKey: string | undefined;

  for (const rawLine of frontMatter.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) {
      continue;
    }

    const nestedMatch = rawLine.match(/^\s{2,}([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedMatch && activeObjectKey) {
      const [, key, value] = nestedMatch;
      const record = result[activeObjectKey];
      if (typeof record === "object" && record !== null && !Array.isArray(record)) {
        (record as Record<string, string>)[key!] = trimYamlValue(value ?? "");
      }
      continue;
    }

    const topLevelMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!topLevelMatch) {
      continue;
    }

    const [, key, value] = topLevelMatch;
    if ((value ?? "").trim() === "") {
      result[key!] = {};
      activeObjectKey = key;
    } else {
      result[key!] = trimYamlValue(value ?? "");
      activeObjectKey = undefined;
    }
  }

  return result;
}

function splitSectionText(text: string, maxChunkChars: number, overlapChars: number): string[] {
  const paragraphs = normalizeText(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.flatMap((item) => splitOversizedParagraph(item, maxChunkChars))) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChunkChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = paragraph;
  }

  if (current) {
    chunks.push(current);
  }

  if (chunks.length <= 1 || overlapChars <= 0) {
    return chunks;
  }

  return chunks.map((chunk, index) => {
    if (index === 0) {
      return chunk;
    }
    const previous = chunks[index - 1]!;
    return `${previous.slice(Math.max(0, previous.length - overlapChars)).trim()}\n\n${chunk}`;
  });
}

function splitOversizedParagraph(paragraph: string, maxChunkChars: number): string[] {
  if (paragraph.length <= maxChunkChars) {
    return [paragraph];
  }

  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S[\s\S]*$/g) ?? [paragraph];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences.map((item) => item.trim()).filter(Boolean)) {
    if (sentence.length > maxChunkChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let index = 0; index < sentence.length; index += maxChunkChars) {
        chunks.push(sentence.slice(index, index + maxChunkChars));
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChunkChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function hasThresholdTable(text: string): boolean {
  return /\|.+\|/.test(text) && /\d/.test(text) && /\b(?:limit|cap|phase|threshold|range|amount)\b/i.test(text);
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2) ?? [],
  );
}

function scoreTokens(queryTokens: Set<string>, candidateTokens: Set<string>): number {
  let score = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      score += 1;
    }
  }
  return score;
}

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

function trimYamlValue(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}

function asDocumentType(value: unknown): CorpusDocumentType {
  return value === "playbook" ? "playbook" : "tax_code";
}

function asStringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, item]) => [key, item.trim()]),
  );
}
