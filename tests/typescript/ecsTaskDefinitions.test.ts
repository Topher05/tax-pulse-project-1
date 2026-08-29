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
  command?: string[];
  dependsOn?: Array<{
    containerName: string;
    condition: string;
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

function valueByName(values: NamedValue[] | undefined, name: string): string | undefined {
  return values?.find((value) => value.name === name)?.value;
}

function valueFromByName(values: NamedValue[] | undefined, name: string): string | undefined {
  return values?.find((value) => value.name === name)?.valueFrom;
}

function expectFargateTask(task: TaskDefinition): void {
  expect(task.networkMode).toBe("awsvpc");
  expect(task.requiresCompatibilities).toContain("FARGATE");
  expect(task.cpu).toBe("512");
  expect(task.memory).toBe("1024");
  expect(task.containerDefinitions).toHaveLength(2);
}

function getContainer(task: TaskDefinition, name: string): ContainerDefinition {
  const container = task.containerDefinitions.find((definition) => definition.name === name);

  if (!container) {
    throw new Error(`Expected a container definition named ${name}.`);
  }

  return container;
}

function expectCloudWatchLogs(
  container: ContainerDefinition,
  logGroup: string,
  streamPrefix = "ecs",
): void {
  expect(container.logConfiguration?.logDriver).toBe("awslogs");
  expect(container.logConfiguration?.options["awslogs-group"]).toBe(logGroup);
  expect(container.logConfiguration?.options["awslogs-region"]).toBe("us-east-1");
  expect(container.logConfiguration?.options["awslogs-stream-prefix"]).toBe(streamPrefix);
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

    const container = getContainer(task, "core-case-service");
    const collector = getContainer(task, "aws-otel-collector");
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
        "OTEL_SERVICE_NAME",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_PROTOCOL",
        "OTEL_PROPAGATORS",
        "OTEL_RESOURCE_ATTRIBUTES",
        "OTEL_TRACES_SAMPLER",
        "OTEL_TRACES_SAMPLER_ARG",
      ]),
    );
    expect(container.dependsOn).toContainEqual({
      containerName: "aws-otel-collector",
      condition: "START",
    });
    expect(names(collector.environment)).toEqual(expect.arrayContaining(["AWS_REGION"]));
    expect(collector.command).toEqual(["--config=/etc/ecs/ecs-default-config.yaml"]);
    expect(collector.portMappings).toEqual(
      expect.arrayContaining([
        {
          containerPort: 4317,
          hostPort: 4317,
          protocol: "tcp",
        },
        {
          containerPort: 4318,
          hostPort: 4318,
          protocol: "tcp",
        },
      ]),
    );
    expectCloudWatchLogs(collector, "Case-Service", "otel");
    expect(valueByName(container.environment, "LIABILITY_ENGINE_BASE")).toBe(
      "http://tax-engine.service.taxpulse.internal:8000",
    );
    expect(valueByName(container.environment, "TAXPULSE_REDIS_URL")).toBe(
      "redis://taxpulse-redis.cache.taxpulse.internal:6379",
    );
    expect(names(container.secrets)).toEqual([
      "DATABASE_URL",
      "JWT_SIGNING_PRIVATE_KEY",
      "JWT_SIGNING_KEY_ID",
      "JWT_SIGNING_SECRET",
      "ASSIST_TENANT_CORPUS_SCOPE_MAP",
      "OPENAI_API_KEY",
    ]);
    for (const secretName of names(container.secrets)) {
      expect(valueFromByName(container.secrets, secretName)).toBe(
        `TERRAFORM_RUNTIME_CONFIG_SECRET_ARN:${secretName}::`,
      );
    }
    expect(container.healthCheck?.command.join(" ")).toContain("/health");
    expectCloudWatchLogs(container, "Case-Service");
  });

  test("defines the Tax Engine runtime contract", () => {
    const task = readTaskDefinition("tax-engine.task-definition.json");
    expectFargateTask(task);

    const container = getContainer(task, "tax-engine");
    const collector = getContainer(task, "aws-otel-collector");
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
    expect(names(container.environment)).toEqual(
      expect.arrayContaining([
        "PORT",
        "JWT_ISSUER",
        "OTEL_SERVICE_NAME",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_PROTOCOL",
        "OTEL_PROPAGATORS",
        "OTEL_RESOURCE_ATTRIBUTES",
        "OTEL_TRACES_SAMPLER",
        "OTEL_TRACES_SAMPLER_ARG",
      ]),
    );
    expect(container.dependsOn).toContainEqual({
      containerName: "aws-otel-collector",
      condition: "START",
    });
    expect(names(container.secrets)).toEqual(["JWT_SIGNING_SECRET"]);
    expect(valueFromByName(container.secrets, "JWT_SIGNING_SECRET")).toBe(
      "TERRAFORM_RUNTIME_CONFIG_SECRET_ARN:JWT_SIGNING_SECRET::",
    );
    expect(container.healthCheck?.command.join(" ")).toContain("/health");
    expect(collector.command).toEqual(["--config=/etc/ecs/ecs-default-config.yaml"]);
    expect(collector.portMappings).toEqual(
      expect.arrayContaining([
        {
          containerPort: 4317,
          hostPort: 4317,
          protocol: "tcp",
        },
        {
          containerPort: 4318,
          hostPort: 4318,
          protocol: "tcp",
        },
      ]),
    );
    expectCloudWatchLogs(container, "Tax-Engine");
    expectCloudWatchLogs(collector, "Tax-Engine", "otel");
  });
});
