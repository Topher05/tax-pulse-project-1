output "transition_api_url" {
  description = "Base invoke URL for the authenticated transition HTTP API."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "transition_api_id" {
  description = "HTTP API identifier for the transition API."
  value       = aws_apigatewayv2_api.transition.id
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
  description = "Stage-changed projection Lambda function ARN."
  value       = aws_lambda_function.stage_changed_consumer.arn
}
