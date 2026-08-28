variable "aws_region" {
  type        = string
  description = "The AWS region to deploy resources to."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "The environment name (e.g. dev, staging, prod)."
  default     = "dev"
}

variable "vpc_cidr" {
  type        = string
  description = "The CIDR block for the VPC."
  default     = "10.0.0.0/16"
}

variable "db_name" {
  type        = string
  description = "The name of the PostgreSQL database."
  default     = "taxpulse"
}

variable "db_username" {
  type        = string
  description = "The master username for the PostgreSQL database."
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "The master password for the PostgreSQL database."
  sensitive   = true
}

variable "name_prefix" {
  type        = string
  description = "Name prefix shared by SCRUM-164 delivery resources."
  default     = "taxpulse"
}

variable "resource_owner" {
  type        = string
  description = "Human or team responsible for the provisioned stack, recorded in resource tags."
  default     = "christopher-martus"
}

variable "iam_permissions_boundary_arn" {
  type        = string
  description = "Required permissions boundary for every Terraform-managed IAM role in the trainee sandbox account."
  default     = "arn:aws:iam::814650854375:policy/TraineeSandboxBoundary"
}

variable "lambda_consumer_role_name" {
  type        = string
  description = "Name for the Terraform-managed transition Lambda execution role."
  default     = null
}

variable "core_case_image_tag" {
  type        = string
  description = "Verified immutable ECR image tag for the Core Case Service task definition."
  default     = "seedfix-arm64-v2-20260827"
}

variable "core_case_image_uri" {
  type        = string
  description = "Optional full immutable image URI for the Core Case Service. When null, use the managed ECR repository and image tag."
  default     = null
}

variable "core_case_image_repository_arn" {
  type        = string
  description = "Optional ECR repository ARN used to pull an externally supplied Core Case Service image."
  default     = null
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days for sandbox ECS services."
  default     = 30
}

variable "observability_trace_sampling_ratio" {
  type        = number
  description = "Trace sampling ratio used by the sandbox ECS services."
  default     = 1
}

variable "tax_engine_image_tag" {
  type        = string
  description = "Verified immutable ECR image tag for the Tax Engine task definition."
  default     = "scrum-202-rs256-aud-20260827"
}

variable "tax_engine_image_uri" {
  type        = string
  description = "Optional full immutable image URI for the Tax Engine. When null, use the managed ECR repository and image tag."
  default     = null
}

variable "tax_engine_image_repository_arn" {
  type        = string
  description = "Optional ECR repository ARN used to pull an externally supplied Tax Engine image."
  default     = null
}

variable "shared_config_secret_arn" {
  type        = string
  description = "Optional existing Secrets Manager ARN. When null, Terraform creates a stack-scoped runtime secret."
  default     = null
}

variable "jwt_signing_private_key" {
  type        = string
  description = "PKCS#8 RSA private key used by the Core Case Service to issue stack JWTs when Terraform manages the runtime secret."
  sensitive   = true
  default     = null
}

variable "jwt_signing_key_id" {
  type        = string
  description = "RS256 key identifier paired with jwt_signing_private_key."
  default     = null
}

variable "jwt_signing_secret" {
  type        = string
  description = "High-entropy compatibility secret for service revisions that still require JWT_SIGNING_SECRET alongside the RS256 keypair."
  sensitive   = true
  default     = null
}

variable "jwt_public_jwk" {
  type        = string
  description = "Public RSA JWK JSON for the shared JWT issuer metadata Lambda."
  sensitive   = true

  validation {
    condition     = can(jsondecode(nonsensitive(var.jwt_public_jwk)))
    error_message = "jwt_public_jwk must be valid JSON. The issuer metadata Lambda validates the RSA JWK shape at startup."
  }
}

variable "jwt_audience" {
  type        = list(string)
  description = "JWT audiences accepted by the transition HTTP API."
  default     = ["taxpulse-http-api"]
}

variable "login_base_domain" {
  type        = string
  description = "Base domain used to resolve tenant login hostnames."
  default     = "taxpulse.example"
}

variable "redis_url" {
  type        = string
  description = "Optional Redis URL override for the Core Case Service. Defaults to the SCRUM-162 ElastiCache TLS endpoint."
  default     = null
}

variable "lambda_runtime_environment" {
  type        = map(string)
  description = "Non-secret and environment-specific variables for the transition Lambdas."
  sensitive   = true
  default     = {}

  validation {
    condition     = !contains(keys(var.lambda_runtime_environment), "AWS_REGION")
    error_message = "AWS_REGION is reserved by Lambda and must not be supplied in lambda_runtime_environment."
  }
}

variable "present_to_client_lambda_zip_path" {
  type        = string
  description = "Path to the zipped present-to-client Lambda artifact produced by npm run build:lambdas."
  default     = "../dist/present-to-client-lambda.zip"
}

variable "execute_lambda_zip_path" {
  type        = string
  description = "Path to the zipped execute Lambda artifact produced by npm run build:lambdas."
  default     = "../dist/execute-lambda.zip"
}

variable "enable_stage_changed_consumer_lambda" {
  type        = bool
  description = "Whether to create the SCRUM-159 SQS-triggered stage-changed queue projection Lambda."
  default     = true
}

variable "stage_changed_consumer_lambda_zip_path" {
  type        = string
  description = "Path to the zipped stage-changed consumer Lambda artifact produced by npm run build:lambdas."
  default     = "../dist/stage-changed-consumer.zip"
}

variable "issuer_metadata_lambda_zip_path" {
  type        = string
  description = "Path to the issuer-metadata Lambda ZIP artifact produced by npm run build:lambdas."
  default     = "../dist/issuer-metadata-lambda.zip"
}

variable "spa_bucket_name" {
  type        = string
  description = "Optional globally unique S3 bucket name for the private SPA origin."
  default     = null
}

variable "github_actions_repository" {
  type        = string
  description = "GitHub owner/repository allowed to assume the SCRUM-168 release role."
  default     = "AI-Native-2026-06-22-FedStack/tax-pulse-project-team-1"
}

variable "enable_release_pipeline" {
  type        = bool
  description = "Whether this stack owns the account-level GitHub Actions OIDC provider and release role."
  default     = true
}

variable "github_actions_release_branch" {
  type        = string
  description = "Git ref branch name allowed to assume the SCRUM-168 release role."
  default     = "development"
}
