import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/dependency-security-gate.yml");

describe("Dependency and secret gate workflow", () => {
  test("uses the Blacksmith runner and runs the PR security scans", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("actions: read");
    expect(workflow).toContain("pull-requests: read");
    expect(workflow).toContain("security-events: write");
    expect(workflow).toContain(
      "google/osv-scanner-action/.github/workflows/osv-scanner-reusable-pr.yml@v2.5.0",
    );
    expect(workflow).toContain("runs-on: blacksmith-2vcpu-ubuntu-2404");
    expect(workflow).toContain("gitleaks/gitleaks-action@v3");
    expect(workflow).toContain("fetch-depth: 0");
  });

  test("keeps the dependency scan and secret scan enforcement explicit", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("--include-git-root");
    expect(workflow).toContain("--recursive");
    expect(workflow).toContain("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    expect(workflow).toContain("GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}");
    expect(workflow).toContain("upload-sarif: false");
    expect(workflow).toContain("fail-on-vuln: true");
  });
});
