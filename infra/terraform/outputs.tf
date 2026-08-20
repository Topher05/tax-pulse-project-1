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
