locals {
  resource_prefix = "${var.name_prefix}-${var.environment}"
  present_name    = "${local.resource_prefix}-present-to-client"
  execute_name    = "${local.resource_prefix}-execute"
  consumer_name   = "${local.resource_prefix}-stage-changed-consumer"
  api_name        = "${local.resource_prefix}-transition-api"
  tags = merge(var.tags, {
    env  = var.environment
    user = var.user
  })
  lambda_environment = merge(var.runtime_environment, {
    AWS_REGION                                 = var.aws_region
    TAXPULSE_STAGE_CHANGED_TOPIC_ARN           = var.stage_changed_topic_arn
    TAXPULSE_ACTION_ITEM_TOPIC_ARN             = var.action_item_created_topic_arn
    TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE = var.projection_table_name
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

resource "aws_iam_role" "lambda" {
  name               = "${local.resource_prefix}-lambda-consumer-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = local.tags
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
    sid       = "ConsumeStageChangedQueue"
    actions   = ["sqs:ChangeMessageVisibility", "sqs:DeleteMessage", "sqs:GetQueueAttributes", "sqs:ReceiveMessage"]
    resources = [var.stage_changed_queue_arn]
  }

  statement {
    sid       = "UpdateProjectionTable"
    actions   = ["dynamodb:UpdateItem"]
    resources = [var.projection_table_arn]
  }
}

resource "aws_iam_role_policy" "runtime_access" {
  name   = "${local.resource_prefix}-lambda-runtime-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.runtime_access.json
}

resource "aws_cloudwatch_log_group" "present_to_client" {
  name              = "/aws/lambda/${local.present_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "execute" {
  name              = "/aws/lambda/${local.execute_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "stage_changed_consumer" {
  name              = "/aws/lambda/${local.consumer_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "transition_api_access" {
  name              = "/aws/apigateway/${local.api_name}"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_lambda_function" "present_to_client" {
  function_name    = local.present_name
  description      = "Transition a Tax Plan Cycle from Review to Client Approval."
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.presentToClientHandler"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 512
  filename         = var.present_to_client_lambda_zip_path
  source_code_hash = filebase64sha256(var.present_to_client_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = local.lambda_environment
  }

  depends_on = [aws_cloudwatch_log_group.present_to_client]
}

resource "aws_lambda_function" "execute" {
  function_name    = local.execute_name
  description      = "Transition a Tax Plan Cycle from Client Approval to Executed."
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  architectures    = ["arm64"]
  timeout          = 30
  memory_size      = 512
  filename         = var.execute_lambda_zip_path
  source_code_hash = filebase64sha256(var.execute_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = local.lambda_environment
  }

  depends_on = [aws_cloudwatch_log_group.execute]
}

resource "aws_lambda_function" "stage_changed_consumer" {
  function_name    = local.consumer_name
  description      = "Project stage-changed events into DynamoDB."
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  architectures    = ["arm64"]
  timeout          = 60
  memory_size      = 512
  filename         = var.stage_changed_consumer_lambda_zip_path
  source_code_hash = filebase64sha256(var.stage_changed_consumer_lambda_zip_path)
  tags             = local.tags

  environment {
    variables = local.lambda_environment
  }

  depends_on = [aws_cloudwatch_log_group.stage_changed_consumer]
}

resource "aws_lambda_event_source_mapping" "stage_changed_consumer" {
  event_source_arn        = var.stage_changed_queue_arn
  function_name           = aws_lambda_function.stage_changed_consumer.arn
  batch_size              = 10
  function_response_types = ["ReportBatchItemFailures"]
  enabled                 = true
}

resource "aws_apigatewayv2_api" "transition" {
  name          = local.api_name
  protocol_type = "HTTP"
  description   = "Authenticated TaxPulse Tax Plan Cycle transition API."
  tags          = local.tags
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.transition.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  jwt_configuration {
    audience = var.jwt_audience
    issuer   = var.jwt_issuer
  }
  name = "${local.resource_prefix}-jwt"
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
  statement_id  = "AllowExecutionFromTransitionApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.present_to_client.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.transition.execution_arn}/*/*"
}

resource "aws_lambda_permission" "execute_api" {
  statement_id  = "AllowExecutionFromTransitionApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.execute.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.transition.execution_arn}/*/*"
}
