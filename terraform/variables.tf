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

variable "core_case_image_tag" {
  type        = string
  description = "Immutable ECR image tag for the Core Case Service task definition."
  default     = "v1.0.0.0"
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
  description = "Immutable ECR image tag for the Tax Engine task definition."
  default     = "v1.0.0.0"
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
  description = "Secrets Manager ARN containing DATABASE_URL and JWT_SIGNING_SECRET JSON keys."
}

variable "jwt_issuer" {
  type        = string
  description = "JWT issuer expected by deployed services and transition Lambdas."
  default     = "https://auth.taxpulse.example"
}

variable "jwt_audience" {
  type        = list(string)
  description = "JWT audiences accepted by the transition HTTP API."
  default     = ["taxpulse-transition-api"]
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

variable "spa_bucket_name" {
  type        = string
  description = "Optional globally unique S3 bucket name for the private SPA origin."
  default     = null
}
