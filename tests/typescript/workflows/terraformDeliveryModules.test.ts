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
    expect(ecsServices).toMatch(
      /service_discovery_namespace\s+=\s+"service\.taxpulse\.internal"/,
    );
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
    expect(lambdaConsumers).toContain(
      "count = var.enable_stage_changed_consumer_lambda ? 1 : 0",
    );
    expect(lambdaConsumers).toContain("resources = [var.stage_changed_queue_arn]");
    expect(lambdaConsumers).toContain("event_source_arn        = var.stage_changed_queue_arn");
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

  test("routes uncached API traffic to the ALB and rewrites only SPA routes", () => {
    const spaDelivery = readTerraform("terraform/modules/spa_delivery/main.tf");
    const delivery = readTerraform("terraform/delivery.tf");

    expect(spaDelivery).toContain("api_cache_policy_id = \"4135ea2d-6df8-44a3-9df3-4b5a84be39ad\"");
    expect(spaDelivery).toContain('resource "aws_cloudfront_origin_request_policy" "api"');
    expect(spaDelivery).toContain('resource "aws_cloudfront_function" "spa_route_rewrite"');
    expect(spaDelivery).toContain('"/auth/*"');
    expect(spaDelivery).toContain('"/v1/*"');
    expect(spaDelivery).toContain("origin_protocol_policy = \"http-only\"");
    expect(spaDelivery).not.toContain("response_page_path = \"/index.html\"");
    expect(delivery).toContain("api_origin_domain_name = module.ecs_services.api_origin_domain_name");
  });

  test("uses public-IP ECS tasks when the sandbox policy forbids NAT gateways", () => {
    const vpc = readTerraform("terraform/vpc.tf");
    const ecsServices = readTerraform("terraform/modules/ecs_services/main.tf");

    expect(vpc).not.toContain('resource "aws_nat_gateway" "main"');
    expect(vpc).not.toContain('resource "aws_eip" "nat"');
    expect(ecsServices).toContain("subnets          = var.public_subnet_ids");
    expect(ecsServices).toContain("assign_public_ip = true");
  });

  test("generates an isolated transition Lambda role name unless explicitly overridden", () => {
    const delivery = readTerraform("terraform/delivery.tf");
    const rootVariables = readTerraform("terraform/variables.tf");
    const lambdaConsumers = readTerraform("terraform/modules/lambda_consumers/main.tf");
    const lambdaVariables = readTerraform("terraform/modules/lambda_consumers/variables.tf");

    expect(rootVariables).toContain('variable "lambda_consumer_role_name"');
    expect(rootVariables).toContain("default     = null");
    expect(delivery).toContain("local.resource_name_prefix}-transition-lambda-role");
    expect(lambdaVariables).toContain('variable "lambda_consumer_role_name"');
    expect(lambdaConsumers).toContain("name                 = var.lambda_consumer_role_name");
    expect(lambdaConsumers).toContain("permissions_boundary = var.permissions_boundary_arn");
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
    expect(releasePipeline).toContain('data "aws_caller_identity" "current" {}');
    expect(releasePipeline).toContain('arn:aws:ecs:%s:%s:service/%s/%s');
    expect(releasePipeline).toContain("module.ecs_services.cluster_name");
    expect(releasePipeline).toContain("module.ecs_services.core_case_service_name");
    expect(releasePipeline).toContain("module.ecs_services.tax_engine_service_name");
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
