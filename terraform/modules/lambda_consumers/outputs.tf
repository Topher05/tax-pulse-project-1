output "transition_api_url" {
  description = "Base invoke URL for the transition HTTP API."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "jwt_issuer" {
  description = "Public issuer URL served by the issuer metadata Lambda."
  value       = trimsuffix(aws_lambda_function_url.issuer_metadata.function_url, "/")
}

output "present_to_client_lambda_arn" {
  description = "Present-to-client Lambda function ARN."
  value       = aws_lambda_function.present_to_client.arn
}

output "execute_lambda_arn" {
  description = "Execute Lambda function ARN."
  value       = aws_lambda_function.execute.arn
}

output "stage_changed_consumer_lambda_arn" {
  description = "Optional stage-changed consumer Lambda ARN."
  value       = var.enable_stage_changed_consumer_lambda ? aws_lambda_function.stage_changed_consumer[0].arn : null
}
