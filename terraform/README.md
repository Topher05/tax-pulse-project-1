# TaxPulse Terraform

## Fresh-apply smoke

The active root creates its SNS topics, SQS queue and DLQ, transition HTTP API, Lambda
functions, ECS services, and SPA delivery resources. Lambda ZIPs must exist before
`terraform apply` because Terraform calculates their source hashes during planning.

Build all four deployable Lambda artifacts from a clean checkout with:

```text
npm ci
npm run build:lambdas
```

This creates the exact paths used by the root defaults:

- `dist/present-to-client-lambda.zip`
- `dist/execute-lambda.zip`
- `dist/stage-changed-consumer.zip`
- `dist/issuer-metadata-lambda.zip`

The build uses the repository-pinned `esbuild` and direct `archiver` dependencies. The
generated `dist/` directory is ignored and must not be committed.

### Clean-environment prerequisites

Terraform uses the standard AWS credential chain. Select credentials outside Terraform
with AWS environment variables, shared credentials/configuration, or an explicitly
selected AWS CLI profile. The old developer-specific profile and bridge file are not
required.

Before applying, confirm the AWS account, region, expected cost, and a clean/disposable
account or a unique `name_prefix` and `environment` that cannot collide with existing
resources. Use both a unique S3 backend key and unique name inputs. Do not apply against
the shared `dev` state until its separately managed resources are imported and reconciled.

The target environment must also provide:

- `db_password`, `jwt_signing_private_key`, `jwt_signing_key_id`, and `jwt_public_jwk`.
  The root creates a stack-scoped runtime secret containing the newly created RDS endpoint.
  To use an externally managed secret instead, set `shared_config_secret_arn` with
  `DATABASE_URL`, `JWT_SIGNING_PRIVATE_KEY`, and `JWT_SIGNING_KEY_ID` JSON keys.
- A public JWK derived from the signing key. `npm run jwt:public-jwk` prints it when run
  in an approved issuer-admin environment.
- A valid synthetic bearer token after apply. The root provisions its own issuer metadata
  Lambda and configures the HTTP API authorizer from that public issuer URL.
- The four Lambda ZIP artifacts described above.
- Immutable, ARM64-compatible Core Case Service and Tax Engine images. By default these
  are pulled from the Terraform-created ECR repositories using `*_image_tag`. For a clean
  environment using already published images, set `core_case_image_uri` and
  `tax_engine_image_uri`; for private external ECR repositories also set the matching
  `*_image_repository_arn` values.

### Canonical dev migration procedure

The shared `dev` state is the canonical application stack. It deliberately
replaces the legacy ALB and target groups that were created in the AWS default
VPC, then redeploys the Terraform-managed ECS services into the managed VPC.
Do not use `-target` for this migration and do not delete the old manual API,
Lambda, SNS, or SQS resources until the post-apply smoke test passes.

Before the first canonical apply, import the pre-existing ECS services once:

```powershell
terraform -chdir=terraform import `
  'module.ecs_services.aws_ecs_service.core_case' `
  'taxpulse-api/core-case-service'
terraform -chdir=terraform import `
  'module.ecs_services.aws_ecs_service.tax_engine' `
  'taxpulse-api/tax-engine'
```

Review the plan carefully. The expected replacements are the legacy ALB and
its two default-VPC target groups; all named ECS services are updated in place.

### Isolated apply procedure

Prepare an uncommitted `terraform/terraform.tfvars` containing the required secret values,
immutable image inputs, and any environment-specific values. Do not commit that file,
credentials, tokens, or taxpayer data.

Use a unique S3 backend key for the smoke environment. For example, from PowerShell:

```powershell
$env:TAXPULSE_STATE_KEY = "scrum-202/<unique-run>/terraform.tfstate"
terraform -chdir=terraform init -reconfigure `
  -backend-config="key=$env:TAXPULSE_STATE_KEY"
terraform -chdir=terraform validate
terraform -chdir=terraform apply -var-file=terraform.tfvars `
  -var="name_prefix=tp202" `
  -var="environment=s202"
```

The target AWS account and region, backend key, expected resource cost, deployable ECS
image digests, signing-key inputs, and valid JWT must be confirmed before apply. The JWT
must represent a clearly synthetic tenant and case prepared in the target environment;
never place the private key, bearer token, or tfvars in committed files or logs.

After apply, derive the smoke endpoints and projection table from Terraform outputs:

```powershell
$env:TAXPULSE_ALB_BASE_URL = terraform -chdir=terraform output -raw api_base_url
$env:TAXPULSE_TRANSITION_API_URL = terraform -chdir=terraform output -raw transition_api_url
$env:JWT_ISSUER = terraform -chdir=terraform output -raw jwt_issuer_url
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
- `jwt_signing_private_key`
- `jwt_signing_key_id`
- `jwt_public_jwk`

Optional delivery inputs include immutable image tags, Lambda zip artifact paths,
`shared_config_secret_arn`, `spa_bucket_name`, and `redis_url`. The root creates the event resources and enables the
stage-changed projection consumer by default. If `redis_url` is omitted, the ECS task
configuration uses the SCRUM-162 ElastiCache TLS endpoint.

The GitHub Actions OIDC provider and release role are account-level resources. This root
is intended for the account's canonical stack; use a separate backend/account for an
isolated disposable apply when those account-level resources already exist elsewhere.

The JSON files under `deployment/` remain source contracts with placeholders;
Terraform owns the real resource IDs and emits deploy-time outputs.
