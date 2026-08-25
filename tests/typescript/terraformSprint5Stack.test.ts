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
