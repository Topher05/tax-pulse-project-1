# TaxPulse Terraform

This is the active Terraform root for SCRUM-162, SCRUM-163, and SCRUM-164.
SCRUM-163's security gate scans this `terraform/` directory with `terraform fmt`,
`terraform validate`, Checkov, and tfsec.

## SCRUM-164 Modules

SCRUM-164 keeps delivery resources modular under `terraform/modules/`:

- `ecs_services` creates the ECR, IAM, CloudWatch, ALB, target group, task
  definition, and ECS service resources for the Core Case Service and Tax Engine.
- `lambda_consumers` creates the present-to-client and execute Lambdas behind API
  Gateway, with optional stage-changed SQS consumer wiring.
- `spa_delivery` creates the private S3 origin and CloudFront distribution for
  the SPA.

## Required Delivery Inputs

Provide these values through uncommitted tfvars or CI variables:

- `db_password`
- `shared_config_secret_arn`
- `stage_changed_topic_arn`
- `stage_changed_queue_url`
- `action_item_created_topic_arn`

Optional delivery inputs include immutable image tags, Lambda zip artifact paths,
`spa_bucket_name`, `redis_url`, and `stage_changed_queue_arn` when the optional
stage-changed consumer Lambda is enabled. If `redis_url` is omitted, the ECS task
configuration uses the SCRUM-162 ElastiCache TLS endpoint.

The JSON files under `deployment/` remain source contracts with placeholders;
Terraform owns the real resource IDs and emits deploy-time outputs.
