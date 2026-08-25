import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readTerraformModule(moduleName: string, fileName: string): string {
  return readFileSync(
    resolve(process.cwd(), "terraform", "modules", moduleName, fileName),
    "utf8",
  );
}

function readTerraformRoot(fileName: string): string {
  return readFileSync(resolve(process.cwd(), "terraform", fileName), "utf8");
}

function readLambdaBuildScript(fileName: string): string {
  return readFileSync(
    resolve(process.cwd(), "src", "typescript", "shared", "scripts", "lambda-build", fileName),
    "utf8",
  );
}

function readDeploymentTemplate(): string {
  return readFileSync(
    resolve(process.cwd(), "deployment", "PresentToClient-Draft.template.yaml"),
    "utf8",
  );
}

describe("Sprint 5 Terraform module contracts", () => {
  test("root provisions events and connects their outputs to delivery modules", () => {
    const delivery = readTerraformRoot("delivery.tf");

    expect(delivery).toContain('module "events"');
    expect(delivery).toContain('source = "./modules/events"');
    expect(delivery).toContain("module.events.stage_changed_topic_arn");
    expect(delivery).toContain("module.events.stage_changed_queue_url");
    expect(delivery).toContain("module.events.stage_changed_queue_arn");
    expect(delivery).toContain("module.events.action_item_created_topic_arn");
    expect(delivery).toContain("projection_table_arn");
    expect(delivery).toContain("projection_table_name");
    expect(delivery).toContain("enable_stage_changed_consumer_lambda");
    expect(delivery).not.toContain("var.stage_changed_topic_arn");
    expect(delivery).not.toContain("var.stage_changed_queue_url");
    expect(delivery).not.toContain("var.stage_changed_queue_arn");
    expect(delivery).not.toContain("var.action_item_created_topic_arn");
  });

  test("root retains the public ALB, transition API, and SPA outputs", () => {
    const outputs = readTerraformRoot("outputs.tf");

    expect(outputs).toContain('output "api_base_url"');
    expect(outputs).toContain('output "transition_api_url"');
    expect(outputs).toContain('output "spa_url"');
    expect(outputs).toContain("module.ecs_services.api_base_url");
    expect(outputs).toContain("module.lambda_consumers.transition_api_url");
    expect(outputs).toContain("module.spa_delivery.spa_url");
  });

  test("events module declares managed topics, queue, DLQ, policy, and redrive", () => {
    const main = readTerraformModule("events", "main.tf");

    expect(main).toContain('resource "aws_sns_topic" "stage_changed"');
    expect(main).toContain('resource "aws_sns_topic" "action_item_created"');
    expect(main).toContain("fifo_topic                  = true");
    expect(main).toContain('resource "aws_sqs_queue" "stage_changed"');
    expect(main).toContain('resource "aws_sqs_queue" "stage_changed_dlq"');
    expect(main).toContain('resource "aws_sns_topic_subscription" "stage_changed_to_queue"');
    expect(main).toContain('resource "aws_sqs_queue_policy" "stage_changed"');
    expect(main).toContain("redrive_policy = jsonencode");
  });

  test("Lambda module requires JWT routes and partial-batch projection handling", () => {
    const main = readTerraformModule("lambda_consumers", "main.tf");

    expect(main).toContain('resource "aws_apigatewayv2_authorizer" "jwt"');
    expect(main).toContain('authorization_type = "JWT"');
    expect(main).toContain('resource "aws_cloudwatch_log_group" "transition_api_access"');
    expect(main).toContain("access_log_settings {");
    expect(main).toContain('authorizer_error = "$context.authorizer.error"');
    expect(main).toContain("POST /v1/tax-plan-cycles/{caseId}/present-to-client");
    expect(main).toContain("POST /v1/tax-plan-cycles/{caseId}/execute");
    expect(main).toContain('function_response_types = ["ReportBatchItemFailures"]');
    expect(main).toContain('actions   = ["dynamodb:UpdateItem"]');
    expect(main).toContain("user = var.user");
    expect(main).toContain("env  = var.environment");
  });

  test("Lambda handlers and builders use the ZIP-root module contract", () => {
    const main = readTerraformModule("lambda_consumers", "main.tf");
    const builders = [
      ["build-present-to-client-lambda.mjs", "dist/present-to-client-lambda"],
      ["build-execute-lambda.mjs", "dist/execute-lambda"],
      ["build-stage-changed-consumer-lambda.mjs", "dist/stage-changed-consumer"],
    ] as const;

    expect(main).toContain('handler          = "index.presentToClientHandler"');
    expect(main).toContain('handler          = "index.handler"');
    expect(main).not.toContain("present-to-client-lambda/index.presentToClientHandler");
    expect(main).not.toContain("execute-lambda/index.handler");
    expect(main).not.toContain("stage-changed-consumer/index.handler");

    for (const [fileName, stagingDirectory] of builders) {
      const script = readLambdaBuildScript(fileName);

      expect(script).toContain("rm(stagingDirectory, { force: true, recursive: true })");
      expect(script).toContain(`packageLambda("${stagingDirectory}", "${stagingDirectory}.zip")`);
    }

    expect(readFileSync(resolve(process.cwd(), "package.json"), "utf8")).toContain(
      '"build:lambdas": "npm run build:present-to-client-lambda && npm run build:execute-lambda && npm run build:stage-changed-consumer-lambda"',
    );
  });

  test("ECS task definitions support immutable external images with managed-ECR fallbacks", () => {
    const rootVariables = readTerraformRoot("variables.tf");
    const delivery = readTerraformRoot("delivery.tf");
    const ecsVariables = readTerraformModule("ecs_services", "variables.tf");
    const ecsMain = readTerraformModule("ecs_services", "main.tf");
    const normalizedDelivery = delivery.replace(/\s+/g, " ");

    for (const variable of [
      "core_case_image_uri",
      "tax_engine_image_uri",
      "core_case_image_repository_arn",
      "tax_engine_image_repository_arn",
    ]) {
      expect(rootVariables).toContain(`variable "${variable}"`);
      expect(ecsVariables).toContain(`variable "${variable}"`);
      expect(normalizedDelivery).toContain(`${variable} = var.${variable}`);
    }

    expect(ecsMain).toContain("coalesce(var.core_case_image_uri");
    expect(ecsMain).toContain("coalesce(var.tax_engine_image_uri");
    expect(ecsMain).toContain("image     = local.core_case_image");
    expect(ecsMain).toContain("image     = local.tax_engine_image");
    expect(ecsMain).toContain("local.core_case_pull_repository_arn");
    expect(ecsMain).toContain("local.tax_engine_pull_repository_arn");
  });

  test("transition and projection Lambdas use separate least-privilege roles", () => {
    const main = readTerraformModule("lambda_consumers", "main.tf");

    expect(main).toContain('resource "aws_iam_role" "transition"');
    expect(main).toContain('resource "aws_iam_role" "projection"');
    expect(main).toContain("role             = aws_iam_role.transition.arn");
    expect(main).toContain("role             = aws_iam_role.projection[0].arn");
    expect(main).toContain('data "aws_iam_policy_document" "transition_access"');
    expect(main).toContain('data "aws_iam_policy_document" "projection_access"');

    const projectionPolicy = main.slice(main.indexOf('data "aws_iam_policy_document" "projection_access"'));
    expect(projectionPolicy).toContain("sqs:ReceiveMessage");
    expect(projectionPolicy).toContain('actions   = ["dynamodb:UpdateItem"]');
    expect(projectionPolicy).not.toContain("sns:Publish");
    expect(projectionPolicy).not.toContain("secretsmanager:GetSecretValue");

    const transitionPolicy = main.slice(
      main.indexOf('data "aws_iam_policy_document" "transition_access"'),
      main.indexOf('resource "aws_iam_role_policy" "transition_access"'),
    );
    expect(transitionPolicy).toContain("sns:Publish");
    expect(transitionPolicy).toContain("secretsmanager:GetSecretValue");
    expect(transitionPolicy).not.toContain("sqs:ReceiveMessage");
    expect(transitionPolicy).not.toContain("dynamodb:UpdateItem");
  });

  test("SAM transition API records access-log context without token data", () => {
    const template = readDeploymentTemplate();

    expect(template).toContain("TaxPulseHttpApiAccessLogs:");
    expect(template).toContain("AccessLogSettings:");
    expect(template).toContain('"authorizer_error":"$context.authorizer.error"');
    expect(template).toContain('"request_id":"$context.requestId"');
    expect(template).not.toContain("$context.identity.sourceIp");
    expect(template).not.toContain("$context.authorizer.claims");
  });
});
