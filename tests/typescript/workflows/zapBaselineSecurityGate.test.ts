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

function expectGateToPass(report: unknown): void {
  expect(() => runZapGate(report)).not.toThrow();
}

function expectGateToFail(report: unknown): void {
  expect(() => runZapGate(report)).toThrow();
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

  test("allows valid reports with empty alerts", () => {
    expectGateToPass({ site: [{ alerts: [] }] });
  });

  test("allows valid reports with informational, low, and medium alerts", () => {
    expectGateToPass({
      site: [
        {
          alerts: [{ riskcode: "0" }, { riskcode: "1" }, { riskcode: "2" }],
        },
      ],
    });
  });

  test("fails reports containing High alerts", () => {
    expectGateToFail({ site: [{ alerts: [{ riskcode: "3" }] }] });
  });

  test("fails malformed ZAP report JSON", () => {
    expectGateToFail("not json");
  });

  test("fails invalid ZAP report roots and site containers", () => {
    expectGateToFail(null);
    expectGateToFail([]);
    expectGateToFail({});
    expectGateToFail({ site: {} });
    expectGateToFail({ site: [] });
    expectGateToFail({ site: [null] });
    expectGateToFail({ site: [[]] });
  });

  test("fails invalid site alert collections", () => {
    expectGateToFail({ site: [{ alerts: null }] });
    expectGateToFail({ site: [{ alerts: {} }] });
    expectGateToFail({ site: [{ alerts: [null] }] });
    expectGateToFail({ site: [{ alerts: [[]] }] });
  });

  test("fails malformed alert risk codes", () => {
    expectGateToFail({ site: [{ alerts: [{ riskcode: 3 }] }] });
    expectGateToFail({ site: [{ alerts: [{ riskcode: "9" }] }] });
    expectGateToFail({ site: [{ alerts: [{}] }] });
  });
});

describe("SCRUM-169 release integration", () => {
  test("scans the deployed SPA after deployment through the reusable workflow", () => {
    const workflow = readFileSync(releaseWorkflowPath, "utf8");

    expect(workflow).toContain("spa_url: ${{ steps.deployed-spa.outputs.spa_url }}");
    expect(workflow).toContain("hashicorp/setup-terraform@v4");
    expect(workflow).toContain("terraform_wrapper: false");
    expect(workflow).toContain("terraform -chdir=terraform init -input=false");
    expect(workflow).toContain('SPA_URL="$(terraform -chdir=terraform output -raw spa_url)"');
    expect(workflow).toContain('if [[ -z "$SPA_URL" ]]');
    expect(workflow).toContain('if [[ ! "$SPA_URL" =~ ^https://.+ ]]');
    expect(workflow).toContain("zap-baseline:");
    expect(workflow).toContain("needs: verify-and-deploy");
    expect(workflow).toContain("uses: ./.github/workflows/zap-baseline.yml");
    expect(workflow).toContain("target_url: ${{ needs.verify-and-deploy.outputs.spa_url }}");
    expect(workflow).not.toContain("cloudfront.net");

    const deployIndex = workflow.indexOf("Deploy Tax Engine service");
    const zapIndex = workflow.indexOf("zap-baseline:");
    expect(deployIndex).toBeGreaterThan(-1);
    expect(zapIndex).toBeGreaterThan(deployIndex);
  });

  test("fails invalid terraform output before invoking the reusable ZAP workflow", () => {
    const workflow = readFileSync(releaseWorkflowPath, "utf8");

    const invalidOutputCheckIndex = workflow.indexOf('if [[ ! "$SPA_URL" =~ ^https://.+ ]]');
    const zapIndex = workflow.indexOf("zap-baseline:");
    expect(invalidOutputCheckIndex).toBeGreaterThan(-1);
    expect(zapIndex).toBeGreaterThan(invalidOutputCheckIndex);
  });

  test("publishes a release evidence manifest after build, deploy, and zap success", () => {
    const workflow = readFileSync(releaseWorkflowPath, "utf8");

    expect(workflow).toContain("release-evidence:");
    expect(workflow).toContain("name: Release Evidence Manifest");
    expect(workflow).toContain("- build-core-case");
    expect(workflow).toContain("- build-tax-engine");
    expect(workflow).toContain("- verify-and-deploy");
    expect(workflow).toContain("- zap-baseline");
    expect(workflow).toContain("release_commit_sha");
    expect(workflow).toContain("commit_checks_url");
    expect(workflow).toContain("actions_run_url");
    expect(workflow).toContain("deployed_spa_url");
    expect(workflow).toContain("immutable_ref");
    expect(workflow).toContain("trivy-report-taxpulse-core-case");
    expect(workflow).toContain("sbom-taxpulse-core-case");
    expect(workflow).toContain("trivy-report-taxpulse-tax-engine");
    expect(workflow).toContain("sbom-taxpulse-tax-engine");
    expect(workflow).toContain("zap-baseline-reports");
    expect(workflow).toContain("release-evidence-manifest");
  });
});
