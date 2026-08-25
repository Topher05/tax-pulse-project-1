# TaxPulse Terraform

## Fresh-apply smoke

The active root creates its SNS topics, SQS queue and DLQ, transition HTTP API, Lambda
functions, ECS services, and SPA delivery resources. Lambda ZIPs must exist before
`terraform apply` because Terraform calculates their source hashes during planning.

Build all three deployable Lambda artifacts from a clean checkout with:

```text
npm ci
npm run build:lambdas
```

This creates the exact paths used by the root defaults:

- `dist/present-to-client-lambda.zip`
- `dist/execute-lambda.zip`
- `dist/stage-changed-consumer.zip`

The build uses the repository-pinned `esbuild` and direct `archiver` dependencies. The
generated `dist/` directory is ignored and must not be committed.

### Clean-environment prerequisites

Terraform uses the standard AWS credential chain. Select credentials outside Terraform
with AWS environment variables, shared credentials/configuration, or an explicitly
selected AWS CLI profile. The old developer-specific profile and bridge file are not
required.

Before applying, confirm the AWS account, region, expected cost, and a clean/disposable
account or a unique `name_prefix` and `environment` that cannot collide with existing
resources. A unique S3 backend key isolates Terraform state only; it does not isolate
AWS resources with globally shared names or prevent collisions in the same account.

The target environment must also provide:

- `db_password` and `shared_config_secret_arn` for the database and runtime secret.
- A reachable `jwt_issuer`, matching `jwt_audience`, and a valid synthetic bearer token.
- The three Lambda ZIP artifacts described above.
- Immutable, ARM64-compatible Core Case Service and Tax Engine images. By default these
  are pulled from the Terraform-created ECR repositories using `*_image_tag`. For a clean
  environment using already published images, set `core_case_image_uri` and
  `tax_engine_image_uri`; for private external ECR repositories also set the matching
  `*_image_repository_arn` values.

### Isolated apply procedure

Prepare an uncommitted `terraform/terraform.tfvars` containing the required secret values,
immutable image inputs, and any environment-specific values. Do not commit that file,
credentials, tokens, or taxpayer data.

Use a unique S3 backend key for the smoke environment. For example, from PowerShell:

```powershell
$env:TAXPULSE_STATE_KEY = "scrum-202-step2/<unique-run>/terraform.tfstate"
terraform -chdir=terraform init -reconfigure `
  -backend-config="key=$env:TAXPULSE_STATE_KEY"
terraform -chdir=terraform validate
terraform -chdir=terraform apply -var-file=terraform.tfvars
```

The target AWS account and region, backend key, expected resource cost, deployable ECS
images, Secrets Manager ARN, reachable JWT issuer, and valid JWT must be confirmed before
apply. The JWT must represent a clearly synthetic tenant and case prepared in the target
environment; never place the bearer token in committed files or logs.

After apply, derive the smoke endpoints and projection table from Terraform outputs:

```powershell
$env:TAXPULSE_ALB_BASE_URL = terraform -chdir=terraform output -raw api_base_url
$env:TAXPULSE_TRANSITION_API_URL = terraform -chdir=terraform output -raw transition_api_url
$env:TAXPULSE_PROJECTION_TABLE_NAME = terraform -chdir=terraform output -raw dynamodb_table_name
$env:AWS_REGION = "<the configured aws_region>"
$env:TAXPULSE_SMOKE_BEARER_TOKEN = "<set-in-memory-only>"
$env:TAXPULSE_SMOKE_TENANT_ID = "synthetic-tenant"
$env:TAXPULSE_SMOKE_CASE_ID = "synthetic-case"
npm run aws:fresh-apply-smoke
```

The smoke command performs an authenticated ALB tax calculation, an authorized
present-to-client transition, and bounded DynamoDB projection polling. It must report
successful HTTP statuses and `projectedStage: "Client Approval"`. Replace the placeholder
token and IDs with synthetic values for the target environment; do not record the token.

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

Optional delivery inputs include immutable image tags, Lambda zip artifact paths,
`spa_bucket_name`, and `redis_url`. The root creates the event resources and enables the
stage-changed projection consumer by default. If `redis_url` is omitted, the ECS task
configuration uses the SCRUM-162 ElastiCache TLS endpoint.

The JSON files under `deployment/` remain source contracts with placeholders;
Terraform owns the real resource IDs and emits deploy-time outputs.
