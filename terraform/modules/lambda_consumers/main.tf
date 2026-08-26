locals {
  api_name                    = "${var.name_prefix}-transition-api"
  present_to_client_name      = "${var.name_prefix}-present-to-client"
  execute_name                = "${var.name_prefix}-execute"
  stage_changed_consumer_name = "${var.name_prefix}-stage-changed-consumer"
  runtime                     = "nodejs22.x"
  tags = merge(var.tags, {
    env  = var.environment
    user = var.user
  })
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

resource "aws_iam_role" "transition" {
  name               = var.lambda_consumer_role_name
  description        = "Runtime role for TaxPulse transition Lambdas."
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = local.tags
}

resource "aws_iam_role" "projection" {
  count              = var.enable_stage_changed_consumer_lambda ? 1 : 0
  name               = "${var.name_prefix}-lambda-projection-role"
  description        = "Runtime role for the TaxPulse stage-changed projection consumer."
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "transition_basic_execution" {
  role       = aws_iam_role.transition.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "projection_basic_execution" {
  count      = var.enable_stage_changed_consumer_lambda ? 1 : 0
  role       = aws_iam_role.projection[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "transition_access" {
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

}

resource "aws_iam_role_policy" "transition_access" {
  name   = "${var.name_prefix}-lambda-transition-access"
  role   = aws_iam_role.transition.id
  policy = data.aws_iam_policy_document.transition_access.json
}

data "aws_iam_policy_document" "projection_access" {
  count = var.enable_stage_changed_consumer_lambda ? 1 : 0

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

  statement {
    sid       = "UpdateProjectionTable"
    actions   = ["dynamodb:UpdateItem"]
    resources = [var.projection_table_arn]
  }
}

resource "aws_iam_role_policy" "projection_access" {
  count  = var.enable_stage_changed_consumer_lambda ? 1 : 0
  name   = "${var.name_prefix}-lambda-projection-access"
  role   = aws_iam_role.projection[0].id
  policy = data.aws_iam_policy_document.projection_access[0].json
}

resource "aws_cloudwatch_log_group" "present_to_client" {
  name              = "/aws/lambda/${local.present_to_client_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "execute" {
  name              = "/aws/lambda/${local.execute_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "stage_changed_consumer" {
  count             = var.enable_stage_changed_consumer_lambda ? 1 : 0
  name              = "/aws/lambda/${local.stage_changed_consumer_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "transition_api_access" {
  name              = "/aws/apigateway/${local.api_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_lambda_function" "present_to_client" {
  function_name    = local.present_to_client_name
  description      = "Transition a Tax Plan Cycle from Review to Client Approval."
  role             = aws_iam_role.transition.arn
  runtime          = local.runtime
  handler          = "index.presentToClientHandler"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 512
  filename         = var.present_to_client_lambda_zip_path
  source_code_hash = filebase64sha256(var.present_to_client_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.present_to_client]
}

resource "aws_lambda_function" "execute" {
  function_name    = local.execute_name
  description      = "Transition a Tax Plan Cycle from Client Approval to Executed."
  role             = aws_iam_role.transition.arn
  runtime          = local.runtime
  handler          = "index.handler"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 512
  filename         = var.execute_lambda_zip_path
  source_code_hash = filebase64sha256(var.execute_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.execute]
}

resource "aws_lambda_function" "stage_changed_consumer" {
  count            = var.enable_stage_changed_consumer_lambda ? 1 : 0
  function_name    = local.stage_changed_consumer_name
  description      = "Consume stage-changed SQS events and update the Plan Cycle Queue projection."
  role             = aws_iam_role.projection[0].arn
  runtime          = local.runtime
  handler          = "index.handler"
  architectures    = ["arm64"]
  timeout          = 60
  memory_size      = 512
  filename         = var.stage_changed_consumer_lambda_zip_path
  source_code_hash = filebase64sha256(var.stage_changed_consumer_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = var.runtime_environment
  }

  depends_on = [aws_cloudwatch_log_group.stage_changed_consumer]
}

resource "aws_lambda_event_source_mapping" "stage_changed_consumer" {
  count                   = var.enable_stage_changed_consumer_lambda ? 1 : 0
  event_source_arn        = var.stage_changed_queue_arn
  function_name           = aws_lambda_function.stage_changed_consumer[0].arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
  enabled                 = true
}

resource "aws_apigatewayv2_api" "transition" {
  name          = local.api_name
  protocol_type = "HTTP"
  description   = "TaxPulse SCRUM-160 Lambda transition API."
  tags          = local.tags

  cors_configuration {
    allow_headers = ["authorization", "content-type"]
    allow_methods = ["POST", "OPTIONS"]
    allow_origins = ["*"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.transition.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.name_prefix}-jwt"

  jwt_configuration {
    audience = var.jwt_audience
    issuer   = var.jwt_issuer
  }

}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.transition.id
  name        = "$default"
  auto_deploy = true
  tags        = local.tags

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.transition_api_access.arn
    format = jsonencode({
      request_id       = "$context.requestId"
      route_key        = "$context.routeKey"
      status           = "$context.status"
      response_latency = "$context.responseLatency"
      authorizer_error = "$context.authorizer.error"
      error_message    = "$context.error.message"
    })
  }
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
  api_id             = aws_apigatewayv2_api.transition.id
  route_key          = "POST /v1/tax-plan-cycles/{caseId}/present-to-client"
  target             = "integrations/${aws_apigatewayv2_integration.present_to_client.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "execute" {
  api_id             = aws_apigatewayv2_api.transition.id
  route_key          = "POST /v1/tax-plan-cycles/{caseId}/execute"
  target             = "integrations/${aws_apigatewayv2_integration.execute.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
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
