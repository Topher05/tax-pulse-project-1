output "api_base_url" {
  description = "HTTP base URL for ALB-routed API traffic."
  value       = "http://${aws_lb.api.dns_name}"
}

output "api_origin_domain_name" {
  description = "ALB DNS name used as a CloudFront API origin."
  value       = aws_lb.api.dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN."
  value       = aws_lb.api.arn
}

output "http_listener_arn" {
  description = "HTTP listener ARN for path routing rules."
  value       = aws_lb_listener.http.arn
}

output "core_case_target_group_arn" {
  description = "Target group ARN for /v1 Core Case Service traffic."
  value       = aws_lb_target_group.core_case.arn
}

output "tax_engine_target_group_arn" {
  description = "Target group ARN for calculation/scenario Tax Engine traffic."
  value       = aws_lb_target_group.tax_engine.arn
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.api.name
}

output "core_case_service_name" {
  description = "Core Case Service ECS service name."
  value       = aws_ecs_service.core_case.name
}

output "tax_engine_service_name" {
  description = "Tax Engine ECS service name."
  value       = aws_ecs_service.tax_engine.name
}

output "core_case_log_group_name" {
  description = "CloudWatch log group name for the Core Case Service and collector sidecar."
  value       = aws_cloudwatch_log_group.core_case.name
}

output "tax_engine_log_group_name" {
  description = "CloudWatch log group name for the Tax Engine and collector sidecar."
  value       = aws_cloudwatch_log_group.tax_engine.name
}

output "core_case_repository_arn" {
  description = "ECR repository ARN for the Core Case Service image."
  value       = aws_ecr_repository.core_case.arn
}

output "core_case_repository_url" {
  description = "ECR repository URL for the Core Case Service image."
  value       = aws_ecr_repository.core_case.repository_url
}

output "tax_engine_repository_arn" {
  description = "ECR repository ARN for the Tax Engine image."
  value       = aws_ecr_repository.tax_engine.arn
}

output "tax_engine_repository_url" {
  description = "ECR repository URL for the Tax Engine image."
  value       = aws_ecr_repository.tax_engine.repository_url
}

output "execution_role_arn" {
  description = "ECS task execution role ARN."
  value       = aws_iam_role.execution.arn
}

output "core_case_task_role_arn" {
  description = "Core Case Service ECS task role ARN."
  value       = aws_iam_role.core_case_task.arn
}

output "tax_engine_task_role_arn" {
  description = "Tax Engine ECS task role ARN."
  value       = aws_iam_role.tax_engine_task.arn
}
