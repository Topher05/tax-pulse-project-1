variable "aws_region" {
  description = "AWS region for regional TaxPulse resources."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment label used in tags and generated names."
  type        = string
  default     = "sandbox"
}

variable "name_prefix" {
  description = "Name prefix shared by the SCRUM-164 Terraform resources."
  type        = string
  default     = "taxpulse"
}

variable "tags" {
  description = "Common tags applied to all supported resources."
  type        = map(string)
  default = {
    env  = "sandbox"
    user = "chimaobi-okorie"
  }
}

variable "vpc_id" {
  description = "VPC where the ALB, target groups, and ECS service security groups are created. SCRUM-162 owns the VPC."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the internet-facing ALB."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Fargate tasks. Use SCRUM-162 private subnets when available."
  type        = list(string)
}

variable "core_case_image_tag" {
  description = "Immutable ECR image tag for the Core Case Service task definition."
  type        = string
}

variable "tax_engine_image_tag" {
  description = "Immutable ECR image tag for the Tax Engine task definition."
  type        = string
}

variable "shared_config_secret_arn" {
  description = "Secrets Manager ARN containing DATABASE_URL and JWT_SIGNING_SECRET JSON keys."
  type        = string
}

variable "jwt_issuer" {
  description = "JWT issuer expected by the deployed services and transition Lambdas."
  type        = string
  default     = "https://auth.taxpulse.example"
}

variable "login_base_domain" {
  description = "Base domain used to resolve tenant login hostnames."
  type        = string
  default     = "taxpulse.example"
}

variable "redis_url" {
  description = "Managed Redis/ElastiCache URL consumed by the Core Case Service."
  type        = string
}

variable "stage_changed_topic_arn" {
  description = "SNS topic ARN for stage-changed CloudEvents."
  type        = string
}

variable "stage_changed_queue_url" {
  description = "SQS queue URL subscribed to the stage-changed topic."
  type        = string
}

variable "stage_changed_queue_arn" {
  description = "SQS queue ARN used by the optional stage-changed Lambda event source mapping."
  type        = string
}

variable "action_item_created_topic_arn" {
  description = "SNS topic ARN for action-item-created CloudEvents emitted by the present-to-client saga."
  type        = string
}

variable "lambda_runtime_environment" {
  description = "Non-secret and environment-specific variables for the transition Lambdas. Put secrets in uncommitted tfvars or a secrets integration."
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "present_to_client_lambda_zip_path" {
  description = "Path to the zipped present-to-client Lambda artifact built from dist/present-to-client-lambda."
  type        = string
  default     = "../../dist/present-to-client-lambda.zip"
}

variable "execute_lambda_zip_path" {
  description = "Path to the zipped execute Lambda artifact built from dist/execute-lambda."
  type        = string
  default     = "../../dist/execute-lambda.zip"
}

variable "enable_stage_changed_consumer_lambda" {
  description = "Whether to create the SCRUM-159 SQS-triggered stage-changed queue projection Lambda."
  type        = bool
  default     = false
}

variable "stage_changed_consumer_lambda_zip_path" {
  description = "Path to the zipped stage-changed consumer Lambda artifact when enable_stage_changed_consumer_lambda is true."
  type        = string
  default     = "../../dist/stage-changed-consumer.zip"
}

variable "spa_bucket_name" {
  description = "Optional globally-unique S3 bucket name for the private SPA origin. Leave null to derive one from account, prefix, and environment."
  type        = string
  default     = null
}
