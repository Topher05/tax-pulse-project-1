import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/terraform-security-gate.yml");
const tfsecConfigPath = resolve(process.cwd(), "terraform/.tfsec/config.yml");
const vpcPath = resolve(process.cwd(), "terraform/vpc.tf");

describe("Terraform security gate workflow", () => {
  test("uses the Blacksmith runner and scans the seeded Terraform root", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("runs-on: blacksmith-2vcpu-ubuntu-2404");
    expect(workflow).toContain("terraform/**");
    expect(workflow).toContain(".github/workflows/terraform-security-gate.yml");
    expect(workflow).toContain("working-directory: terraform");
  });

  test("runs the required Terraform and security checks", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("terraform fmt -check -recursive");
    expect(workflow).toContain("terraform init -backend=false");
    expect(workflow).toContain("terraform validate");
    expect(workflow).toContain("checkov -d . --framework terraform --hard-fail-on HIGH --compact --quiet");
    expect(workflow).toContain(
      "docker run --rm -w /src/terraform -v \"${{ github.workspace }}:/src\" aquasec/tfsec-ci tfsec . --minimum-severity HIGH --no-color",
    );
  });

  test("keeps the tfsec severity floor explicit in repo config", () => {
    const tfsecConfig = readFileSync(tfsecConfigPath, "utf8");

    expect(tfsecConfig).toContain("minimum_severity: HIGH");
  });

  test("scans the current VPC configuration without legacy suppressions", () => {
    const vpc = readFileSync(vpcPath, "utf8");

    expect(vpc).toContain("map_public_ip_on_launch = true");
    expect(vpc).not.toContain("checkov:skip=CKV_AWS_130");
    expect(vpc).not.toContain("tfsec:ignore:aws-ec2-no-public-ip-subnet");
  });
});
