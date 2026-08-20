# SCRUM-164 Terraform Root

This root configuration turns the deployment contracts from SCRUM-157,
SCRUM-158, SCRUM-159, SCRUM-160, and SCRUM-161 into reusable Terraform modules.

## Modules

- `modules/ecs_services` creates the ECS cluster, Fargate task definitions, ECR
  repositories, ALB, target groups, listener rules, service security groups, IAM
  task roles, and ECS services for the Core Case Service and Tax Engine.
- `modules/lambda_consumers` creates the present-to-client and execute Lambda
  functions behind API Gateway and can optionally create the SQS-triggered
  stage-changed consumer Lambda when its bundle exists.
- `modules/spa_delivery` creates the private S3 SPA bucket, CloudFront Origin
  Access Control, CloudFront distribution, SPA fallback rewrites, and deployment
  outputs.

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
```

Do not commit `terraform.tfvars` if it contains environment-specific secrets or
private endpoints.

## Existing Sandbox Resources

AWS account `814650854375` already contains some manually-created SCRUM-157 and
SCRUM-158 resources:

- ALB: `arn:aws:elasticloadbalancing:us-east-1:814650854375:loadbalancer/app/taxpulse-api-alb/962b5650b94eda05`
- ECS cluster: `taxpulse-api`
- ECS services: `core-case-service`, `tax-engine`
- Target groups: `taxpulse-core-case`, `taxpulse-tax-engine`
- SNS topics: `stage-changed`, `action-item-created.fifo`
- SQS queue: `taxpulse-stage-changed`

Import those resources into state before applying this root against the sandbox,
or use a different `name_prefix`/environment for a clean test stack. The JSON
files under `deployment/` remain source contracts and should keep their
placeholders rather than committed live ARNs.

## SPA Deploy

After applying, use the Terraform outputs to sync and invalidate the SPA:

```bash
npm run build:web
aws s3 sync ../../src/pulseUI/dist "s3://$(terraform output -raw spa_bucket_name)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform output -raw cloudfront_distribution_id)" \
  --paths "/*"
```
