variable "aws_region" {
  description = "AWS region for ECS and ALB resources."
  type        = string
}

variable "environment" {
  description = "Environment label for tags and generated names."
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for ECS, ALB, IAM, ECR, and log resources."
  type        = string
}

variable "collector_image" {
  description = "Pinned ADOT collector image used as the ECS sidecar."
  type        = string
  default     = "public.ecr.aws/aws-observability/aws-otel-collector:v0.30.0"
}

variable "log_retention_days" {
  description = "CloudWatch log retention for the service log groups."
  type        = number
  default     = 30
}

variable "observability_trace_sampling_ratio" {
  description = "Parent-based trace sampling ratio used by the application containers."
  type        = number
  default     = 1
}

variable "vpc_id" {
  description = "VPC ID for the ALB target groups and security groups."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the internet-facing ALB."
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS Fargate tasks."
  type        = list(string)
}

variable "ecs_service_security_group_id" {
  description = "SCRUM-162 ECS service security group ID used by Fargate tasks."
  type        = string
}

variable "core_case_image_tag" {
  description = "Immutable ECR image tag for the Core Case Service."
  type        = string
}

variable "core_case_image_uri" {
  description = "Optional full immutable image URI for the Core Case Service."
  type        = string
  default     = null
}

variable "core_case_image_repository_arn" {
  description = "Optional ECR repository ARN for an externally supplied Core Case Service image."
  type        = string
  default     = null
}

variable "tax_engine_image_tag" {
  description = "Immutable ECR image tag for the Tax Engine."
  type        = string
}

variable "tax_engine_image_uri" {
  description = "Optional full immutable image URI for the Tax Engine."
  type        = string
  default     = null
}

variable "tax_engine_image_repository_arn" {
  description = "Optional ECR repository ARN for an externally supplied Tax Engine image."
  type        = string
  default     = null
}

variable "shared_config_secret_arn" {
  description = "Secrets Manager ARN with DATABASE_URL and JWT_SIGNING_SECRET keys."
  type        = string
}

variable "jwt_issuer" {
  description = "JWT issuer used by API containers."
  type        = string
}

variable "login_base_domain" {
  description = "Base tenant login domain for the Core Case Service."
  type        = string
}

variable "redis_url" {
  description = "Managed Redis URL for the Core Case Service."
  type        = string
}

variable "stage_changed_topic_arn" {
  description = "SNS topic ARN for stage-changed event publishing."
  type        = string
}

variable "stage_changed_queue_url" {
  description = "SQS queue URL for stage-changed consumers."
  type        = string
}

variable "action_item_created_topic_arn" {
  description = "SNS topic ARN for action-item-created event publishing."
  type        = string
}
