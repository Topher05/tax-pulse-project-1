import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/sast-security-gate.yml");

describe("SAST security gate workflow", () => {
  test("runs on every pull request using the Blacksmith runner", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("on:\n  pull_request:");
    expect(workflow).not.toContain("paths:");
    expect(workflow).toContain("runs-on: blacksmith-2vcpu-ubuntu-2404");
  });

  test("runs Semgrep and Bandit with explicit high-severity enforcement", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("semgrep scan --config auto --error --severity ERROR src/typescript");
    expect(workflow).toContain(
      "bandit --recursive src/tax_liability_engine --severity-level high",
    );
  });
});
