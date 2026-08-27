import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const zapWorkflowPath = resolve(process.cwd(), ".github/workflows/zap-baseline.yml");
const releaseWorkflowPath = resolve(process.cwd(), ".github/workflows/container-scan-sbom.yml");
const zapGatePath = resolve(process.cwd(), ".github/scripts/enforce-zap-high-severity.mjs");

function runZapGate(report: unknown): void {
  const fixtureDirectory = mkdtempSync(resolve(tmpdir(), "zap-gate-"));
  const reportPath = resolve(fixtureDirectory, "report_json.json");

  try {
    writeFileSync(reportPath, typeof report === "string" ? report : JSON.stringify(report));
    execFileSync(process.execPath, [zapGatePath, reportPath], { stdio: "pipe" });
  } finally {
    rmSync(fixtureDirectory, { force: true, recursive: true });
  }
}

describe("ZAP baseline security gate workflow", () => {
  test("accepts a target URL for reusable and manual runs", () => {
    const workflow = readFileSync(zapWorkflowPath, "utf8");

    expect(workflow).toContain("workflow_call:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("target_url:");
    expect(workflow).toContain("required: true");
    expect(workflow).toContain("type: string");
    expect(workflow).toContain("target: ${{ inputs.target_url }}");
  });

  test("runs ZAP without issue creation and preserves all reports", () => {
    const workflow = readFileSync(zapWorkflowPath, "utf8");

    expect(workflow).toContain("runs-on: blacksmith-2vcpu-ubuntu-2404");
    expect(workflow).toContain("timeout-minutes: 15");
    expect(workflow).toContain("zaproxy/action-baseline@v0.15.0");
    expect(workflow).toContain("allow_issue_writing: false");
    expect(workflow).toContain("fail_action: false");
    expect(workflow).toContain("cmd_options: -I");
    expect(workflow).toContain("if: ${{ always() }}");
    expect(workflow).toContain("name: zap-baseline-reports");
    expect(workflow).toContain("report_html.html");
    expect(workflow).toContain("report_md.md");
    expect(workflow).toContain("report_json.json");
  });

  test("fails closed on unsuccessful scans or missing reports", () => {
    const workflow = readFileSync(zapWorkflowPath, "utf8");

    expect(workflow).toContain("continue-on-error: true");
    expect(workflow).toContain('ZAP_OUTCOME: ${{ steps.zap.outcome }}');
    expect(workflow).toContain('if [[ "$ZAP_OUTCOME" != "success" ]]');
    expect(workflow).toContain('if [[ ! -s report_json.json ]]');
    expect(workflow).toContain("node .github/scripts/enforce-zap-high-severity.mjs report_json.json");
    expect(workflow).toContain("set -euo pipefail");
  });

  test("allows reports without High alerts", () => {
    expect(() => runZapGate({ site: [{ alerts: [{ riskcode: "2" }] }] })).not.toThrow();
  });

  test("fails reports containing High alerts", () => {
    expect(() => runZapGate({ site: [{ alerts: [{ riskcode: "3" }] }] })).toThrow();
  });

  test("fails malformed ZAP reports", () => {
    expect(() => runZapGate("not json")).toThrow();
  });
});

describe("SCRUM-169 release integration", () => {
  test("scans the deployed SPA after deployment through the reusable workflow", () => {
    const workflow = readFileSync(releaseWorkflowPath, "utf8");

    expect(workflow).toContain("spa_url: ${{ steps.deployed-spa.outputs.spa_url }}");
    expect(workflow).toContain("spa_url=https://d2x67vhqhb7oh.cloudfront.net");
    expect(workflow).toContain("zap-baseline:");
    expect(workflow).toContain("needs: verify-and-deploy");
    expect(workflow).toContain("uses: ./.github/workflows/zap-baseline.yml");
    expect(workflow).toContain("target_url: ${{ needs.verify-and-deploy.outputs.spa_url }}");

    const deployIndex = workflow.indexOf("Deploy Tax Engine service");
    const zapIndex = workflow.indexOf("zap-baseline:");
    expect(deployIndex).toBeGreaterThan(-1);
    expect(zapIndex).toBeGreaterThan(deployIndex);
  });
});
