locals {
  ordered_public_subnet_ids = [
    aws_subnet.public["public_a"].id,
    aws_subnet.public["public_b"].id,
    aws_subnet.public["public_c"].id,
  ]

  ordered_private_subnet_ids = [
    aws_subnet.private["private_a"].id,
    aws_subnet.private["private_b"].id,
    aws_subnet.private["private_c"].id,
  ]
}

output "vpc_id" {
  description = "The VPC ID for SCRUM-162 managed networking."
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Ordered public subnet IDs for ALB and other ingress resources."
  value       = local.ordered_public_subnet_ids
}

output "private_subnet_ids" {
  description = "Ordered private subnet IDs for ECS services and data stores."
  value       = local.ordered_private_subnet_ids
}

output "ecs_service_security_group_id" {
  description = "Security group ID for future ECS services that need database and Redis access."
  value       = aws_security_group.ecs_service.id
}

output "postgres_endpoint" {
  description = "PostgreSQL writer endpoint hostname and port."
  value       = aws_db_instance.postgres.endpoint
}

output "postgres_address" {
  description = "PostgreSQL writer endpoint hostname."
  value       = aws_db_instance.postgres.address
}

output "postgres_port" {
  description = "PostgreSQL listener port."
  value       = aws_db_instance.postgres.port
}

output "postgres_database_name" {
  description = "PostgreSQL database name provisioned for the application."
  value       = aws_db_instance.postgres.db_name
}

output "postgres_master_username" {
  description = "PostgreSQL master username managed by RDS."
  value       = aws_db_instance.postgres.username
}

output "postgres_resource_id" {
  description = "Stable RDS resource identifier for future integration work."
  value       = aws_db_instance.postgres.resource_id
}

output "dynamodb_table_name" {
  description = "The DynamoDB queue projection table name."
  value       = aws_dynamodb_table.plan_cycle_queue_projection.name
}

output "dynamodb_table_arn" {
  description = "The DynamoDB queue projection table ARN."
  value       = aws_dynamodb_table.plan_cycle_queue_projection.arn
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint hostname."
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_port" {
  description = "Redis listener port."
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_tls_url" {
  description = "TLS Redis connection URL for clients that support in-transit encryption."
  value = format(
    "rediss://%s:%d",
    aws_elasticache_replication_group.redis.primary_endpoint_address,
    aws_elasticache_replication_group.redis.port,
  )
  sensitive = true
}

output "api_base_url" {
  description = "Public HTTP base URL for ALB-routed API traffic."
  value       = module.ecs_services.api_base_url
}

output "core_case_service_name" {
  description = "ECS service name for the Core Case Service."
  value       = module.ecs_services.core_case_service_name
}

output "tax_engine_service_name" {
  description = "ECS service name for the Tax Engine."
  value       = module.ecs_services.tax_engine_service_name
}

output "transition_api_url" {
  description = "API Gateway URL for present-to-client and execute Lambda routes."
  value       = module.lambda_consumers.transition_api_url
}

output "jwt_issuer_url" {
  description = "Public OIDC discovery and JWKS issuer URL used by the HTTP API and services."
  value       = module.lambda_consumers.jwt_issuer
}

output "spa_url" {
  description = "CloudFront URL for the TaxPulse SPA."
  value       = module.spa_delivery.spa_url
}

output "spa_bucket_name" {
  description = "Private S3 origin bucket for SPA artifacts."
  value       = module.spa_delivery.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID used by SPA deploy invalidations."
  value       = module.spa_delivery.cloudfront_distribution_id
}

output "github_actions_release_role_arn" {
  description = "IAM role ARN assumed by the development release workflow for ECR publish, verify, and ECS deploy."
  value       = aws_iam_role.github_actions_release.arn
}

output "runtime_config_secret_arn" {
  description = "Secrets Manager ARN containing the ECS runtime configuration."
  value       = local.runtime_config_secret_arn
}

output "slo_alarm_topic_arn" {
  description = "SNS topic ARN used by the SCRUM-187 CloudWatch SLO alarms."
  value       = module.ecs_services.slo_alarm_topic_arn
}

output "slo_alarm_topic_name" {
  description = "SNS topic name used by the SCRUM-187 CloudWatch SLO alarms."
  value       = module.ecs_services.slo_alarm_topic_name
}

output "slo_alarm_names" {
  description = "CloudWatch alarm names emitted by the SCRUM-187 ECS services module."
  value       = module.ecs_services.slo_alarm_names
}
