import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

type NamedValue = {
  name: string;
  value?: string;
  valueFrom?: string;
};

type ContainerDefinition = {
  name: string;
  image: string;
  portMappings: Array<{
    containerPort: number;
    appProtocol?: string;
  }>;
  environment?: NamedValue[];
  secrets?: NamedValue[];
  healthCheck?: {
    command: string[];
    interval: number;
    timeout: number;
    retries: number;
    startPeriod: number;
  };
  logConfiguration?: {
    logDriver: string;
    options: Record<string, string>;
  };
};

type TaskDefinition = {
  family: string;
  networkMode: string;
  requiresCompatibilities: string[];
  cpu: string;
  memory: string;
  containerDefinitions: ContainerDefinition[];
};

function readTaskDefinition(fileName: string): TaskDefinition {
  return JSON.parse(readFileSync(new URL(`../../deployment/ecs/${fileName}`, import.meta.url), "utf8"));
}

function names(values: NamedValue[] | undefined): string[] {
  return values?.map((value) => value.name) ?? [];
}

function expectFargateTask(task: TaskDefinition): void {
  expect(task.networkMode).toBe("awsvpc");
  expect(task.requiresCompatibilities).toContain("FARGATE");
  expect(task.cpu).toBe("512");
  expect(task.memory).toBe("1024");
  expect(task.containerDefinitions).toHaveLength(1);
}

function getOnlyContainer(task: TaskDefinition): ContainerDefinition {
  expect(task.containerDefinitions).toHaveLength(1);
  const container = task.containerDefinitions[0];

  if (!container) {
    throw new Error("Expected one container definition.");
  }

  return container;
}

function expectCloudWatchLogs(container: ContainerDefinition, logGroup: string): void {
  expect(container.logConfiguration?.logDriver).toBe("awslogs");
  expect(container.logConfiguration?.options["awslogs-group"]).toBe(logGroup);
  expect(container.logConfiguration?.options["awslogs-region"]).toBe("us-east-1");
  expect(container.logConfiguration?.options["awslogs-stream-prefix"]).toBe("ecs");
}

function expectEcrImage(container: ContainerDefinition, repositoryName: string): void {
  expect(container.image).toMatch(
    new RegExp(
      `^814650854375\\.dkr\\.ecr\\.us-east-1\\.amazonaws\\.com/taxpulse/${repositoryName}:[\\w][\\w.-]{0,127}$`,
    ),
  );
  expect(container.image.endsWith(":latest")).toBe(false);
}

describe("ECS Fargate task definitions", () => {
  test("defines the Core Case Service runtime contract", () => {
    const task = readTaskDefinition("core-case-service.task-definition.json");
    expectFargateTask(task);

    const container = getOnlyContainer(task);
    expect(task.family).toBe("taxpulse-core-case-service");
    expect(container.name).toBe("core-case-service");
    expectEcrImage(container, "core-case-service");
    expect(container.portMappings).toContainEqual({
      name: "core-case-service-http",
      containerPort: 3000,
      hostPort: 3000,
      protocol: "tcp",
      appProtocol: "http",
    });
    expect(names(container.environment)).toEqual(
      expect.arrayContaining([
        "NODE_ENV",
        "PORT",
        "JWT_ISSUER",
        "JWT_ACCESS_TOKEN_TTL_SECONDS",
        "JWT_REFRESH_TOKEN_TTL_SECONDS",
        "LIABILITY_ENGINE_BASE",
        "TAXPULSE_LOGIN_BASE_DOMAIN",
        "TAXPULSE_REDIS_URL",
        "AWS_REGION",
        "TAXPULSE_STAGE_CHANGED_TOPIC_ARN",
        "TAXPULSE_STAGE_CHANGED_QUEUE_URL",
      ]),
    );
    expect(names(container.secrets)).toEqual(expect.arrayContaining(["DATABASE_URL", "JWT_SIGNING_SECRET"]));
    expect(container.healthCheck?.command.join(" ")).toContain("/health");
    expectCloudWatchLogs(container, "Case-Service");
  });

  test("defines the Tax Engine runtime contract", () => {
    const task = readTaskDefinition("tax-engine.task-definition.json");
    expectFargateTask(task);

    const container = getOnlyContainer(task);
    expect(task.family).toBe("taxpulse-tax-engine");
    expect(container.name).toBe("tax-engine");
    expectEcrImage(container, "tax-engine");
    expect(container.portMappings).toContainEqual({
      name: "tax-engine-http",
      containerPort: 8000,
      hostPort: 8000,
      protocol: "tcp",
      appProtocol: "http",
    });
    expect(names(container.environment)).toEqual(expect.arrayContaining(["PORT", "JWT_ISSUER"]));
    expect(names(container.secrets)).toEqual(expect.arrayContaining(["JWT_SIGNING_SECRET"]));
    expect(container.healthCheck?.command.join(" ")).toContain("/health");
    expectCloudWatchLogs(container, "Tax-Engine");
  });
});
