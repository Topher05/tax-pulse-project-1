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
  description = "SQS queue ARN that triggers the optional stage-changed consumer Lambda."
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

variable "runtime_environment" {
  description = "Environment variables supplied to all transition Lambda functions."
  type        = map(string)
  sensitive   = true
}
