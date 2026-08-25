output "api_base_url" {
  description = "HTTP base URL for ALB-routed API traffic."
  value       = "http://${aws_lb.api.dns_name}"
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
