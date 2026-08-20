locals {
  api_name                    = "${var.name_prefix}-transition-api"
  present_to_client_name      = "${var.name_prefix}-present-to-client"
  execute_name                = "${var.name_prefix}-execute"
  stage_changed_consumer_name = "${var.name_prefix}-stage-changed-consumer"
  runtime                     = "nodejs22.x"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.name_prefix}-lambda-consumer-role"
  description        = "Runtime role for TaxPulse transition and event consumer Lambdas."
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "runtime_access" {
  statement {
    sid       = "PublishWorkflowEvents"
    actions   = ["sns:Publish"]
    resources = [var.stage_changed_topic_arn, var.action_item_created_topic_arn]
  }

  statement {
    sid       = "ReadRuntimeSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.shared_config_secret_arn]
  }

  statement {
    sid = "ConsumeStageChangedQueue"
    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
    ]
    resources = [var.stage_changed_queue_arn]
  }
}

resource "aws_iam_role_policy" "runtime_access" {
  name   = "${var.name_prefix}-lambda-runtime-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.runtime_access.json
}

resource "aws_cloudwatch_log_group" "present_to_client" {
  name              = "/aws/lambda/${local.present_to_client_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "execute" {
  name              = "/aws/lambda/${local.execute_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "stage_changed_consumer" {
  count             = var.enable_stage_changed_consumer_lambda ? 1 : 0
  name              = "/aws/lambda/${local.stage_changed_consumer_name}"
  retention_in_days = 30
}

resource "aws_lambda_function" "present_to_client" {
  function_name = local.present_to_client_name
  description   = "Transition a Tax Plan Cycle from Review to Client Approval."
  role          = aws_iam_role.lambda.arn
  runtime       = local.runtime
  handler       = "present-to-client-lambda/index.presentToClientHandler"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 512
  filename      = var.present_to_client_lambda_zip_path

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.present_to_client]
}

resource "aws_lambda_function" "execute" {
  function_name = local.execute_name
  description   = "Transition a Tax Plan Cycle from Client Approval to Executed."
  role          = aws_iam_role.lambda.arn
  runtime       = local.runtime
  handler       = "execute-lambda/index.handler"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 512
  filename      = var.execute_lambda_zip_path

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.execute]
}

resource "aws_lambda_function" "stage_changed_consumer" {
  count         = var.enable_stage_changed_consumer_lambda ? 1 : 0
  function_name = local.stage_changed_consumer_name
  description   = "Consume stage-changed SQS events and update the Plan Cycle Queue projection."
  role          = aws_iam_role.lambda.arn
  runtime       = local.runtime
  handler       = "stage-changed-consumer/index.handler"
  architectures = ["arm64"]
  timeout       = 60
  memory_size   = 512
  filename      = var.stage_changed_consumer_lambda_zip_path

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.stage_changed_consumer]
}

resource "aws_lambda_event_source_mapping" "stage_changed_consumer" {
  count            = var.enable_stage_changed_consumer_lambda ? 1 : 0
  event_source_arn = var.stage_changed_queue_arn
  function_name    = aws_lambda_function.stage_changed_consumer[0].arn
  batch_size       = 10
  enabled          = true
}

resource "aws_apigatewayv2_api" "transition" {
  name          = local.api_name
  protocol_type = "HTTP"
  description   = "TaxPulse SCRUM-160 Lambda transition API."

  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["POST", "OPTIONS"]
    allow_origins = ["*"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.transition.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "present_to_client" {
  api_id                 = aws_apigatewayv2_api.transition.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.present_to_client.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "execute" {
  api_id                 = aws_apigatewayv2_api.transition.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.execute.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "present_to_client" {
  api_id    = aws_apigatewayv2_api.transition.id
  route_key = "POST /v1/tax-plan-cycles/{caseId}/present-to-client"
  target    = "integrations/${aws_apigatewayv2_integration.present_to_client.id}"
}

resource "aws_apigatewayv2_route" "execute" {
  api_id    = aws_apigatewayv2_api.transition.id
  route_key = "POST /v1/tax-plan-cycles/{caseId}/execute"
  target    = "integrations/${aws_apigatewayv2_integration.execute.id}"
}

resource "aws_lambda_permission" "present_to_client_api" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.present_to_client.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.transition.execution_arn}/*/*"
}

resource "aws_lambda_permission" "execute_api" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.execute.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.transition.execution_arn}/*/*"
}
