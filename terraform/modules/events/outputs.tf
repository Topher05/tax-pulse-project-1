output "stage_changed_topic_arn" {
  description = "ARN of the stage-changed SNS topic."
  value       = aws_sns_topic.stage_changed.arn
}

output "stage_changed_topic_name" {
  description = "Name of the stage-changed SNS topic."
  value       = aws_sns_topic.stage_changed.name
}

output "action_item_created_topic_arn" {
  description = "ARN of the action-item-created FIFO SNS topic."
  value       = aws_sns_topic.action_item_created.arn
}

output "action_item_created_topic_name" {
  description = "Name of the action-item-created FIFO SNS topic."
  value       = aws_sns_topic.action_item_created.name
}

output "stage_changed_queue_arn" {
  description = "ARN of the stage-changed SQS queue."
  value       = aws_sqs_queue.stage_changed.arn
}

output "stage_changed_queue_url" {
  description = "URL of the stage-changed SQS queue."
  value       = aws_sqs_queue.stage_changed.url
}

output "stage_changed_dlq_arn" {
  description = "ARN of the stage-changed dead-letter queue."
  value       = aws_sqs_queue.stage_changed_dlq.arn
}

output "stage_changed_dlq_url" {
  description = "URL of the stage-changed dead-letter queue."
  value       = aws_sqs_queue.stage_changed_dlq.url
}
