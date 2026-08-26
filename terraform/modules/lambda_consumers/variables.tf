variable "aws_region" {
  description = "AWS region for Lambda and API Gateway resources."
  type        = string
}

variable "environment" {
  description = "Environment label for names and tags."
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for Lambda and API Gateway resources."
  type        = string
}

variable "user" {
  description = "Resource owner included in resource tags."
  type        = string
  default     = "taxpulse"
}

variable "tags" {
  description = "Additional tags applied to taggable resources."
  type        = map(string)
  default     = {}
}

variable "lambda_consumer_role_name" {
  description = "Name of the existing IAM execution role used by the transition Lambdas."
  type        = string
}

variable "shared_config_secret_arn" {
  description = "Secrets Manager ARN that transition Lambdas are allowed to read."
  type        = string
}

variable "present_to_client_lambda_zip_path" {
  description = "Path to the present-to-client Lambda zip artifact."
  type        = string
}

variable "execute_lambda_zip_path" {
  description = "Path to the execute Lambda zip artifact."
  type        = string
}

variable "enable_stage_changed_consumer_lambda" {
  description = "Whether to create the SQS-triggered stage-changed consumer Lambda."
  type        = bool
}

variable "stage_changed_consumer_lambda_zip_path" {
  description = "Path to the stage-changed consumer Lambda zip artifact."
  type        = string
}

variable "stage_changed_queue_arn" {
  description = "Optional SQS queue ARN that triggers the stage-changed consumer Lambda."
  type        = string
  default     = null
}

variable "projection_table_arn" {
  description = "DynamoDB ARN for the optional stage-changed projection consumer."
  type        = string
  default     = null
}

variable "projection_table_name" {
  description = "DynamoDB table name supplied to the optional stage-changed projection consumer."
  type        = string
  default     = null
}

variable "stage_changed_topic_arn" {
  description = "SNS topic ARN for stage-changed event publishing."
  type        = string
}

variable "action_item_created_topic_arn" {
  description = "SNS topic ARN for action-item-created event publishing."
  type        = string
}

variable "jwt_issuer" {
  description = "JWT issuer URL configured on the HTTP API authorizer."
  type        = string
}

variable "jwt_audience" {
  description = "JWT audience values accepted by the HTTP API authorizer."
  type        = list(string)
}

variable "runtime_environment" {
  description = "Environment variables supplied to all transition Lambda functions."
  type        = map(string)
  sensitive   = true
}
