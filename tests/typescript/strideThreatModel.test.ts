import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const repositoryRoot = process.cwd();
const documentPath = resolve(repositoryRoot, "docs/stride-threat-model.md");
const strideCategories = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
] as const;

function sectionFor(document: string, category: string): string {
  const heading = `## ${category}`;
  const start = document.indexOf(heading);
  const nextHeading = document.indexOf("\n## ", start + heading.length);

  expect(start, `Missing STRIDE section: ${category}`).toBeGreaterThanOrEqual(0);

  return document.slice(start, nextHeading === -1 ? document.length : nextHeading);
}

describe("STRIDE threat model document", () => {
  test("contains all threat categories and required fields", () => {
    const document = readFileSync(documentPath, "utf8");

    for (const category of strideCategories) {
      const section = sectionFor(document, category);

      expect(section).toMatch(/\*\*Threat scenario:\*\*/);
      expect(section).toMatch(/\*\*Mitigation:\*\*/);
      expect(section).toMatch(/\*\*Implementation references:\*\*/);
    }

    expect(document.toLowerCase()).toContain("tenant isolation");
    expect(document.toLowerCase()).toContain("audit-trail tampering");
  });

  test("links only to existing local implementation files", () => {
    const document = readFileSync(documentPath, "utf8");
    const localLinks = [...document.matchAll(/\]\((?!https?:\/\/|#)([^)]+)\)/g)].map(
      ([, target]) => target,
    );

    expect(localLinks.length).toBeGreaterThan(0);

    for (const target of localLinks) {
      expect(existsSync(resolve(repositoryRoot, "docs", target!)), target).toBe(true);
    }
  });
});
