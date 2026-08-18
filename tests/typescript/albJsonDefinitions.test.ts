import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

type Tag = {
  Key: string;
  Value: string;
};

type TargetGroupDefinition = {
  Name: string;
  Port: number;
  TargetType: string;
  HealthCheckPath: string;
  VpcId: string;
  Tags: Tag[];
};

type ListenerRuleDefinition = {
  Priority: number;
  Conditions: Array<{
    Field: string;
    PathPatternConfig?: {
      Values: string[];
    };
  }>;
};

type EcsServiceDefinition = {
  serviceName: string;
  taskDefinition: string;
  desiredCount: number;
  launchType: string;
  healthCheckGracePeriodSeconds: number;
  deploymentConfiguration: {
    minimumHealthyPercent: number;
    maximumPercent: number;
  };
  networkConfiguration: {
    awsvpcConfiguration: {
      subnets: string[];
      securityGroups: string[];
      assignPublicIp: string;
    };
  };
  loadBalancers: Array<{
    targetGroupArn: string;
    containerName: string;
    containerPort: number;
  }>;
};

function readAlbJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(new URL(`../../deployment/alb/${fileName}`, import.meta.url), "utf8"));
}

function readEcsJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(new URL(`../../deployment/ecs/${fileName}`, import.meta.url), "utf8"));
}

function tagValues(tags: Tag[]): Record<string, string> {
  return Object.fromEntries(tags.map((tag) => [tag.Key, tag.Value]));
}

describe("SCRUM-158 ALB JSON definitions", () => {
  test("defines an internet-facing ALB in the public subnets", () => {
    const loadBalancer = readAlbJson<{
      Name: string;
      Scheme: string;
      Type: string;
      Subnets: string[];
      SecurityGroups: string[];
      Tags: Tag[];
    }>("load-balancer.json");

    expect(loadBalancer.Name).toBe("taxpulse-api-alb");
    expect(loadBalancer.Scheme).toBe("internet-facing");
    expect(loadBalancer.Type).toBe("application");
    expect(loadBalancer.Subnets).toEqual([
      "subnet-0104ce7ee4752681b",
      "subnet-0e4c7b76f7f2a91b7",
      "subnet-04754cd11ab10a5a5",
    ]);
    expect(loadBalancer.SecurityGroups).toEqual(["sg-018ec94c7599d219c"]);
    expect(tagValues(loadBalancer.Tags)).toMatchObject({
      user: "chimaobi-okorie",
      env: "sandbox",
    });
  });

  test("defines Fargate-compatible target groups for both services", () => {
    const coreCase = readAlbJson<TargetGroupDefinition>("core-case-target-group.json");
    const taxEngine = readAlbJson<TargetGroupDefinition>("tax-engine-target-group.json");

    expect(coreCase).toMatchObject({
      Name: "taxpulse-core-case",
      Port: 3000,
      TargetType: "ip",
      HealthCheckPath: "/health",
      VpcId: "vpc-0f2c3b110a05c423a",
    });
    expect(taxEngine).toMatchObject({
      Name: "taxpulse-tax-engine",
      Port: 8000,
      TargetType: "ip",
      HealthCheckPath: "/health",
      VpcId: "vpc-0f2c3b110a05c423a",
    });
  });

  test("defines listener path rules for case and calculation traffic", () => {
    const coreCaseRule = readAlbJson<ListenerRuleDefinition>("core-case-listener-rule.json");
    const taxEngineRule = readAlbJson<ListenerRuleDefinition>("tax-engine-listener-rule.json");

    expect(coreCaseRule.Priority).toBe(10);
    expect(coreCaseRule.Conditions[0]?.PathPatternConfig?.Values).toEqual(["/v1/*"]);

    expect(taxEngineRule.Priority).toBe(20);
    expect(taxEngineRule.Conditions[0]?.PathPatternConfig?.Values).toEqual([
      "/tax-calculations",
      "/tax-calculations/*",
      "/scenarios/comparisons",
      "/scenarios/comparisons/*",
    ]);
  });

  test("defines ECS services attached to the ALB target groups", () => {
    const coreCase = readEcsJson<EcsServiceDefinition>("core-case-service.json");
    const taxEngine = readEcsJson<EcsServiceDefinition>("tax-engine-service.json");

    expect(coreCase).toMatchObject({
      serviceName: "core-case-service",
      taskDefinition: "arn:aws:ecs:us-east-1:814650854375:task-definition/taxpulse-core-case-service:1",
      desiredCount: 1,
      launchType: "FARGATE",
      healthCheckGracePeriodSeconds: 60,
    });
    expect(coreCase.deploymentConfiguration).toEqual({
      minimumHealthyPercent: 100,
      maximumPercent: 200,
    });
    expect(coreCase.networkConfiguration.awsvpcConfiguration.securityGroups).toEqual([
      "sg-0820ddfb63117696a",
    ]);
    expect(coreCase.loadBalancers).toContainEqual({
      targetGroupArn:
        "arn:aws:elasticloadbalancing:us-east-1:814650854375:targetgroup/taxpulse-core-case/05b4e6ffa119fc42",
      containerName: "core-case-service",
      containerPort: 3000,
    });

    expect(taxEngine).toMatchObject({
      serviceName: "tax-engine",
      taskDefinition: "arn:aws:ecs:us-east-1:814650854375:task-definition/taxpulse-tax-engine:1",
      desiredCount: 1,
      launchType: "FARGATE",
      healthCheckGracePeriodSeconds: 60,
    });
    expect(taxEngine.loadBalancers).toContainEqual({
      targetGroupArn:
        "arn:aws:elasticloadbalancing:us-east-1:814650854375:targetgroup/taxpulse-tax-engine/306b27944c5a636a",
      containerName: "tax-engine",
      containerPort: 8000,
    });
  });
});
