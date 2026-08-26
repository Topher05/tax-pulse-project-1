import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/container-scan-sbom.yml");

describe("SCRUM-168 container release workflow", () => {
  test("keeps release actions scoped to the approved release branches and preserves scan coverage elsewhere", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("branches:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("- development");
    expect(workflow).toContain("- development-scrum168-test");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("if: github.ref == 'refs/heads/development'");
    expect(workflow).toContain("github.ref == 'refs/heads/development-scrum168-test'");
    expect(workflow).toContain("github.ref != 'refs/heads/development' && github.ref != 'refs/heads/development-scrum168-test'");
    expect(workflow).toContain("aws-actions/configure-aws-credentials@v5");
    expect(workflow).toContain("role-to-assume: ${{ vars.AWS_RELEASE_ROLE_ARN }}");
  });

  test("builds ARM64 release images, signs by digest, verifies before deploy, and deploys digest refs", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("platforms: linux/arm64");
    expect(workflow).toContain("push: true");
    expect(workflow).toContain("sigstore/cosign-installer@v3.8.1");
    expect(workflow).toContain("cosign-release: v3.0.6");
    expect(workflow).toContain('cosign sign "${{ steps.release-metadata.outputs.repository }}@${{ steps.release-build.outputs.digest }}"');
    expect(workflow).toContain("Verify Core Case signature");
    expect(workflow).toContain("Verify Tax Engine signature");
    expect(workflow).toContain('RELEASE_WORKFLOW_IDENTITY="https://github.com/${GITHUB_REPOSITORY}/.github/workflows/container-scan-sbom.yml@${GITHUB_REF}"');
    expect(workflow).toContain('--certificate-identity "${RELEASE_WORKFLOW_IDENTITY}"');
    expect(workflow).toContain('--certificate-oidc-issuer "${{ env.RELEASE_WORKFLOW_ISSUER }}"');
    expect(workflow).toContain("aws-actions/amazon-ecs-render-task-definition@v1");
    expect(workflow).toContain("aws-actions/amazon-ecs-deploy-task-definition@v2");
    expect(workflow).toContain("core-case-service.task-definition.json");
    expect(workflow).toContain("tax-engine.task-definition.json");
    expect(workflow).toContain("cluster: taxpulse-api");
  });

  test("fails closed so both signed images verify before any ECS mutation", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    const verifyIndex = workflow.indexOf("Verify Core Case signature");
    const renderIndex = workflow.indexOf("Render Core Case task definition");
    const deployIndex = workflow.indexOf("Deploy Core Case service");

    expect(workflow).toContain("needs:");
    expect(workflow).toContain("- build-core-case");
    expect(workflow).toContain("- build-tax-engine");
    expect(workflow).not.toContain("continue-on-error");
    expect(verifyIndex).toBeGreaterThan(-1);
    expect(renderIndex).toBeGreaterThan(verifyIndex);
    expect(deployIndex).toBeGreaterThan(renderIndex);
  });
});
