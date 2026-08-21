variable "aws_region" {
  description = "AWS region for Lambda and API Gateway resources."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment label for names and tags."
  type        = string
  default     = "sandbox"
}

variable "name_prefix" {
  description = "Name prefix for Lambda and API Gateway resources."
  type        = string
  default     = "taxpulse"
}

variable "user" {
  description = "User or owner included in resource tags."
  type        = string
  default     = "christopher-martus"
}

variable "tags" {
  description = "Additional tags applied to taggable resources."
  type        = map(string)
  default     = {}
}

variable "shared_config_secret_arn" {
  description = "Secrets Manager ARN that transition Lambdas are allowed to read."
  type        = string
}

variable "projection_table_arn" {
  description = "DynamoDB ARN for the stage projection table."
  type        = string
}

variable "projection_table_name" {
  description = "DynamoDB table name for the stage projection table."
  type        = string
}

variable "stage_changed_queue_arn" {
  description = "SQS queue ARN that triggers the stage-changed projection Lambda."
  type        = string
}

variable "stage_changed_topic_arn" {
  description = "SNS topic ARN for stage-changed event publishing."
  type        = string
}

variable "action_item_created_topic_arn" {
  description = "SNS topic ARN for action-item-created event publishing."
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

variable "stage_changed_consumer_lambda_zip_path" {
  description = "Path to the stage-changed consumer Lambda zip artifact."
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
  description = "Environment variables supplied to all Lambda functions."
  type        = map(string)
  sensitive   = true
  default     = {}
}
