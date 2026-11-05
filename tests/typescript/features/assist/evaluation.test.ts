import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  loadEvaluationQuestions,
  loadEvaluationThresholds,
  writeJsonArtifact,
} from "../../../../src/typescript/features/assist/evaluation.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("AI-Assist evaluation contracts", () => {
  test("loads the checked-in 15-question synthetic evaluation bank", async () => {
    const questions = await loadEvaluationQuestions();

    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((question) => question.id)).size).toBe(15);
    for (const question of questions) {
      expect(question.expectedSectionIds.length).toBeGreaterThan(0);
      expect(question.syntheticNotice).toContain("Synthetic");
    }
  });

  test("loads both required aggregate quality thresholds", async () => {
    const thresholds = await loadEvaluationThresholds();

    expect(thresholds.metrics).toEqual([
      { name: "context_relevance", minimumMean: 0.8 },
      { name: "faithfulness", minimumMean: 0.6 },
    ]);
  });

  test("rejects duplicate question IDs and malformed expected section IDs", async () => {
    const duplicatePath = await writeTemporaryJson("duplicate-questions.json", [
      validQuestion("q-001"),
      validQuestion("q-001"),
    ]);
    const malformedPath = await writeTemporaryJson("malformed-questions.json", [
      { ...validQuestion("q-002"), expectedSectionIds: [42] },
    ]);

    await expect(loadEvaluationQuestions(duplicatePath)).rejects.toThrow(
      "question IDs must be unique",
    );
    await expect(loadEvaluationQuestions(malformedPath)).rejects.toThrow(
      "expectedSectionIds[0] must be a non-empty string",
    );
  });

  test("rejects missing, duplicate, and out-of-range thresholds", async () => {
    const missingPath = await writeTemporaryJson("missing-threshold.json", {
      metrics: [{ name: "context_relevance", minimumMean: 0.8 }],
    });
    const duplicatePath = await writeTemporaryJson("duplicate-threshold.json", {
      metrics: [
        { name: "context_relevance", minimumMean: 0.8 },
        { name: "context_relevance", minimumMean: 0.9 },
        { name: "faithfulness", minimumMean: 0.6 },
      ],
    });
    const rangePath = await writeTemporaryJson("range-threshold.json", {
      metrics: [
        { name: "context_relevance", minimumMean: 1.1 },
        { name: "faithfulness", minimumMean: 0.6 },
      ],
    });

    await expect(loadEvaluationThresholds(missingPath)).rejects.toThrow(
      "must define faithfulness",
    );
    await expect(loadEvaluationThresholds(duplicatePath)).rejects.toThrow(
      "metric names must be unique",
    );
    await expect(loadEvaluationThresholds(rangePath)).rejects.toThrow(
      "between 0 and 1",
    );
  });

  test("writes stable JSON artifacts and creates their parent directory", async () => {
    const directory = await createTemporaryDirectory();
    const artifactPath = path.join(directory, "nested", "artifact.json");

    await writeJsonArtifact(artifactPath, { pass: true });

    expect(await readFile(artifactPath, "utf8")).toBe('{\n  "pass": true\n}\n');
  });
});

function validQuestion(id: string): Record<string, unknown> {
  return {
    id,
    question: "Which synthetic section applies?",
    response: "The synthetic section applies.",
    expectedSectionIds: ["SYN-TC-0001-a"],
    syntheticNotice: "Synthetic training content only.",
  };
}

async function writeTemporaryJson(filename: string, value: unknown): Promise<string> {
  const directory = await createTemporaryDirectory();
  const filePath = path.join(directory, filename);
  await writeFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
  return filePath;
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "taxpulse-evaluation-"));
  temporaryDirectories.push(directory);
  return directory;
}
