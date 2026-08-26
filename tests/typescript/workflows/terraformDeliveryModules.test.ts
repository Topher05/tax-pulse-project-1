import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readTerraform(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("SCRUM-164 Terraform delivery modules", () => {
  test("wires Lambda runtime environment variables expected by the handlers", () => {
    const delivery = readTerraform("terraform/delivery.tf");

    expect(delivery).toContain("TAXPULSE_STAGE_CHANGED_TOPIC_ARN");
    expect(delivery).toContain("TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN");
    expect(delivery).not.toContain("TAXPULSE_ACTION_ITEM_TOPIC_ARN");
  });

  test("creates private service discovery for Core Case to reach the Tax Engine", () => {
    const ecsServices = readTerraform("terraform/modules/ecs_services/main.tf");

    expect(ecsServices).toContain('LIABILITY_ENGINE_BASE", value = "http://tax-engine.service.taxpulse.internal:8000"');
    expect(ecsServices).toContain('service_discovery_namespace  = "service.taxpulse.internal"');
    expect(ecsServices).toContain('resource "aws_service_discovery_private_dns_namespace" "service"');
    expect(ecsServices).toContain('resource "aws_service_discovery_service" "tax_engine"');
    expect(ecsServices).toContain("service_registries");
    expect(ecsServices).toContain("aws_service_discovery_service.tax_engine.arn");
    expect(ecsServices).toContain("aws-otel-collector");
    expect(ecsServices).toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
    expect(ecsServices).toContain("OTEL_TRACES_SAMPLER_ARG");
    expect(ecsServices).toContain("ecs-default-config.yaml");
    expect(ecsServices).toContain("xray:PutTraceSegments");
  });

  test("keeps optional stage-changed consumer SQS permissions behind the feature flag", () => {
    const lambdaConsumers = readTerraform("terraform/modules/lambda_consumers/main.tf");
    const lambdaVariables = readTerraform("terraform/modules/lambda_consumers/variables.tf");
    const lambdaReadme = readTerraform("terraform/modules/lambda_consumers/README.md");

    expect(lambdaVariables).toContain('variable "stage_changed_queue_arn"');
    expect(lambdaVariables).toContain("default     = null");
    expect(lambdaConsumers).toContain("dynamic \"statement\"");
    expect(lambdaConsumers).toContain("var.enable_stage_changed_consumer_lambda ? [var.stage_changed_queue_arn] : []");
    expect(lambdaReadme).toMatch(
      /optional\s+unless\s+`enable_stage_changed_consumer_lambda`\s+is\s+true/,
    );
  });

  test("allows CloudFront OAC to decrypt the KMS-encrypted SPA origin", () => {
    const spaDelivery = readTerraform("terraform/modules/spa_delivery/main.tf");

    expect(spaDelivery).toContain('resource "aws_kms_key_policy" "spa"');
    expect(spaDelivery).toContain('sid    = "AllowCloudFrontOriginAccessControlDecrypt"');
    expect(spaDelivery).toContain('"kms:Decrypt"');
    expect(spaDelivery).toContain('"kms:GenerateDataKey"');
    expect(spaDelivery).toContain('identifiers = ["cloudfront.amazonaws.com"]');
    expect(spaDelivery).toContain("values   = [aws_cloudfront_distribution.spa.arn]");
  });

  test("uses a public-subnet NAT gateway shape for private subnet egress", () => {
    const vpc = readTerraform("terraform/vpc.tf");
    const natGatewayBlock = vpc.match(/resource "aws_nat_gateway" "main" \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(vpc).toContain('resource "aws_eip" "nat"');
    expect(natGatewayBlock).toContain("allocation_id = aws_eip.nat.id");
    expect(natGatewayBlock).toContain('subnet_id     = aws_subnet.public["public_a"].id');
    expect(natGatewayBlock).not.toContain("availability_mode");
    expect(natGatewayBlock).not.toContain("vpc_id");
  });

  test("configures the imported FirstLambdaRole for transition Lambda execution", () => {
    const delivery = readTerraform("terraform/delivery.tf");
    const rootVariables = readTerraform("terraform/variables.tf");
    const lambdaConsumers = readTerraform("terraform/modules/lambda_consumers/main.tf");
    const lambdaVariables = readTerraform("terraform/modules/lambda_consumers/variables.tf");

    expect(rootVariables).toContain('variable "lambda_consumer_role_name"');
    expect(rootVariables).toContain('default     = "FirstLambdaRole"');
    expect(delivery).toContain("lambda_consumer_role_name = var.lambda_consumer_role_name");
    expect(lambdaVariables).toContain('variable "lambda_consumer_role_name"');
    expect(lambdaConsumers).toContain("name               = var.lambda_consumer_role_name");
    expect(lambdaConsumers).not.toContain('${var.name_prefix}-lambda-consumer-role');
  });

  test("creates a branch-scoped GitHub Actions release role with least-privilege ECR and ECS access", () => {
    const releasePipeline = readTerraform("terraform/release_pipeline.tf");
    const variables = readTerraform("terraform/variables.tf");
    const outputs = readTerraform("terraform/outputs.tf");
    const ecsOutputs = readTerraform("terraform/modules/ecs_services/outputs.tf");

    expect(variables).toContain('variable "github_actions_repository"');
    expect(variables).toContain('default     = "AI-Native-2026-06-22-FedStack/tax-pulse-project-team-1"');
    expect(variables).toContain('variable "github_actions_release_branch"');
    expect(variables).toContain('default     = "development"');
    expect(releasePipeline).toContain('resource "aws_iam_openid_connect_provider" "github_actions"');
    expect(releasePipeline).toContain('thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]');
    expect(releasePipeline).toContain('repo:${var.github_actions_repository}:ref:refs/heads/${var.github_actions_release_branch}');
    expect(releasePipeline).toContain('actions = ["sts:AssumeRoleWithWebIdentity"]');
    expect(releasePipeline).toContain('"ecr:PutImage"');
    expect(releasePipeline).toContain('"ecr:UploadLayerPart"');
    expect(releasePipeline).toContain('"ecs:RegisterTaskDefinition"');
    expect(releasePipeline).toContain('"ecs:UpdateService"');
    expect(releasePipeline).toContain('"iam:PassRole"');
    expect(releasePipeline).not.toContain('"ecr:*"');
    expect(releasePipeline).not.toContain('"ecs:*"');
    expect(outputs).toContain('output "github_actions_release_role_arn"');
    expect(ecsOutputs).toContain('output "core_case_repository_arn"');
    expect(ecsOutputs).toContain('output "tax_engine_repository_arn"');
    expect(ecsOutputs).toContain('output "execution_role_arn"');
  });
});
