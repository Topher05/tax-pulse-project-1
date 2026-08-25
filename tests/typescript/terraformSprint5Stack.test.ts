import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readTerraformModule(moduleName: string, fileName: string): string {
  return readFileSync(
    resolve(process.cwd(), "terraform", "modules", moduleName, fileName),
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
