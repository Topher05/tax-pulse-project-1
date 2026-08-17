import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const templateText = readFileSync(
  new URL("../../deployment/ecs/alb-services.template.yaml", import.meta.url),
  "utf8",
);

describe("SCRUM-158 ECS ALB services template", () => {
  test("uses the discovered team VPC and public subnets as defaults", () => {
    expect(templateText).toContain("Default: vpc-0f2c3b110a05c423a");
    expect(templateText).toContain(
      "Default: subnet-0104ce7ee4752681b,subnet-0e4c7b76f7f2a91b7,subnet-04754cd11ab10a5a5",
    );
  });

  test("routes case and calculation traffic to separate target groups", () => {
    expect(templateText).toContain("CoreCaseListenerRule:");
    expect(templateText).toContain("- /v1/*");
    expect(templateText).toContain("TargetGroupArn: !Ref CoreTargetGroup");

    expect(templateText).toContain("TaxCalculationListenerRule:");
    expect(templateText).toContain("- /tax-calculations");
    expect(templateText).toContain("- /scenarios/comparisons");
    expect(templateText).toContain("TargetGroupArn: !Ref TaxEngineTargetGroup");
  });

  test("attaches ECS services to health-checked target groups for replacement", () => {
    expect(templateText).toContain("HealthCheckPath: /health");
    expect(templateText).toContain("HealthCheckGracePeriodSeconds: 60");
    expect(templateText).toContain("MinimumHealthyPercent: 100");
    expect(templateText).toContain("MaximumPercent: 200");
    expect(templateText).toContain("ContainerName: core-case-service");
    expect(templateText).toContain("ContainerName: tax-engine");
  });
});
