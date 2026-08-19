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
  ListenerArn: string;
  Priority: number;
  Conditions: Array<{
    Field: string;
    PathPatternConfig?: {
      Values: string[];
    };
  }>;
  Actions: Array<{
    Type: string;
    TargetGroupArn: string;
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
      "SCRUM-162_PUBLIC_SUBNET_A",
      "SCRUM-162_PUBLIC_SUBNET_B",
      "SCRUM-162_PUBLIC_SUBNET_C",
    ]);
    expect(loadBalancer.SecurityGroups).toEqual(["SCRUM-162_ALB_SECURITY_GROUP_ID"]);
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
      VpcId: "SCRUM-162_VPC_ID",
    });
    expect(taxEngine).toMatchObject({
      Name: "taxpulse-tax-engine",
      Port: 8000,
      TargetType: "ip",
      HealthCheckPath: "/health",
      VpcId: "SCRUM-162_VPC_ID",
    });
  });

  test("defines listener path rules for case and calculation traffic", () => {
    const coreCaseRule = readAlbJson<ListenerRuleDefinition>("core-case-listener-rule.json");
    const taxEngineRule = readAlbJson<ListenerRuleDefinition>("tax-engine-listener-rule.json");

    expect(coreCaseRule.Priority).toBe(10);
    expect(coreCaseRule.ListenerArn).toBe("SCRUM-164_TAXPULSE_API_HTTP_LISTENER_ARN");
    expect(coreCaseRule.Conditions[0]?.PathPatternConfig?.Values).toEqual(["/v1/*"]);
    expect(coreCaseRule.Actions).toContainEqual({
      Type: "forward",
      TargetGroupArn: "SCRUM-164_CORE_CASE_TARGET_GROUP_ARN",
    });

    expect(taxEngineRule.Priority).toBe(20);
    expect(taxEngineRule.ListenerArn).toBe("SCRUM-164_TAXPULSE_API_HTTP_LISTENER_ARN");
    expect(taxEngineRule.Conditions[0]?.PathPatternConfig?.Values).toEqual([
      "/tax-calculations",
      "/tax-calculations/*",
      "/scenarios/comparisons",
      "/scenarios/comparisons/*",
    ]);
    expect(taxEngineRule.Actions).toContainEqual({
      Type: "forward",
      TargetGroupArn: "SCRUM-164_TAX_ENGINE_TARGET_GROUP_ARN",
    });
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
      "SCRUM-162_ECS_SERVICE_SECURITY_GROUP_ID",
    ]);
    expect(coreCase.networkConfiguration.awsvpcConfiguration.subnets).toEqual([
      "SCRUM-162_PRIVATE_SUBNET_A",
      "SCRUM-162_PRIVATE_SUBNET_B",
      "SCRUM-162_PRIVATE_SUBNET_C",
    ]);
    expect(coreCase.networkConfiguration.awsvpcConfiguration.assignPublicIp).toBe("DISABLED");
    expect(coreCase.loadBalancers).toContainEqual({
      targetGroupArn: "SCRUM-164_CORE_CASE_TARGET_GROUP_ARN",
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
    expect(taxEngine.networkConfiguration.awsvpcConfiguration.subnets).toEqual([
      "SCRUM-162_PRIVATE_SUBNET_A",
      "SCRUM-162_PRIVATE_SUBNET_B",
      "SCRUM-162_PRIVATE_SUBNET_C",
    ]);
    expect(taxEngine.networkConfiguration.awsvpcConfiguration.assignPublicIp).toBe("DISABLED");
    expect(taxEngine.loadBalancers).toContainEqual({
      targetGroupArn: "SCRUM-164_TAX_ENGINE_TARGET_GROUP_ARN",
      containerName: "tax-engine",
      containerPort: 8000,
    });
  });
});
