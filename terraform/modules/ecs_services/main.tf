data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  resource_name_prefix       = "${var.name_prefix}-${var.environment}"
  uses_legacy_dev_names      = var.name_prefix == "taxpulse" && var.environment == "dev"
  cluster_name               = local.uses_legacy_dev_names ? "taxpulse-api" : "${local.resource_name_prefix}-api"
  core_case_family           = local.uses_legacy_dev_names ? "taxpulse-core-case-service" : "${local.resource_name_prefix}-core-case-service"
  tax_engine_family          = local.uses_legacy_dev_names ? "taxpulse-tax-engine" : "${local.resource_name_prefix}-tax-engine"
  core_case_service_name     = local.uses_legacy_dev_names ? "core-case-service" : "${local.resource_name_prefix}-core-case-service"
  tax_engine_service_name    = local.uses_legacy_dev_names ? "tax-engine" : "${local.resource_name_prefix}-tax-engine"
  core_case_container_name   = "core-case-service"
  tax_engine_container_name  = "tax-engine"
  collector_container_name   = "aws-otel-collector"
  collector_command          = "--config=/etc/ecs/ecs-default-config.yaml"
  core_case_repository_name  = "${var.name_prefix}/core-case-service"
  tax_engine_repository_name = "${var.name_prefix}/tax-engine"
  core_case_log_group_name   = local.uses_legacy_dev_names ? "Case-Service" : "/ecs/${local.resource_name_prefix}-core-case-service"
  tax_engine_log_group_name  = local.uses_legacy_dev_names ? "Tax-Engine" : "/ecs/${local.resource_name_prefix}-tax-engine"
  execution_role_name        = "${var.name_prefix}-ecs-task-execution-role"
  core_case_task_role_name   = "${var.name_prefix}-core-case-task-role"
  tax_engine_task_role_name  = "${var.name_prefix}-tax-engine-task-role"
  # The original dev ALB and target groups are in the account default VPC.
  # These names intentionally create a replacement ingress path in the
  # Terraform-managed VPC before the legacy path is retired.
  alb_name                       = "${local.resource_name_prefix}-api-alb"
  core_case_target_group_name    = "${local.resource_name_prefix}-core-case"
  tax_engine_target_group_name   = "${local.resource_name_prefix}-tax-engine"
  service_discovery_namespace    = "service.taxpulse.internal"
  core_case_image                = coalesce(var.core_case_image_uri, "${aws_ecr_repository.core_case.repository_url}:${var.core_case_image_tag}")
  tax_engine_image               = coalesce(var.tax_engine_image_uri, "${aws_ecr_repository.tax_engine.repository_url}:${var.tax_engine_image_tag}")
  core_case_pull_repository_arn  = coalesce(var.core_case_image_repository_arn, aws_ecr_repository.core_case.arn)
  tax_engine_pull_repository_arn = coalesce(var.tax_engine_image_repository_arn, aws_ecr_repository.tax_engine.arn)
  slo_alarm_prefix               = "${local.resource_name_prefix}-slo"
}

resource "aws_ecr_repository" "core_case" {
  name                 = local.core_case_repository_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle {
    ignore_changes = [image_scanning_configuration, tags, tags_all]
  }
}

resource "aws_ecr_repository" "tax_engine" {
  name                 = local.tax_engine_repository_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle {
    ignore_changes = [image_scanning_configuration, tags, tags_all]
  }
}

resource "aws_ecr_lifecycle_policy" "core_case" {
  repository = aws_ecr_repository.core_case.name
  policy     = file("${path.root}/../deployment/ecr/lifecycle-policy.json")
}

resource "aws_ecr_lifecycle_policy" "tax_engine" {
  repository = aws_ecr_repository.tax_engine.name
  policy     = file("${path.root}/../deployment/ecr/lifecycle-policy.json")
}

resource "aws_cloudwatch_log_group" "core_case" {
  name              = local.core_case_log_group_name
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "tax_engine" {
  name              = local.tax_engine_log_group_name
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "slo_alarm_key" {
  statement {
    sid       = "AllowAccountAdministration"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid    = "AllowCloudWatchAlarmEncryption"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey*",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key" "slo_alarms" {
  description             = "KMS key for TaxPulse SLO alarm notification encryption."
  deletion_window_in_days = 7
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.slo_alarm_key.json

  tags = {
    Name        = "${local.resource_name_prefix}-slo-alarms"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "slo_alarms" {
  name          = "alias/${local.resource_name_prefix}-slo-alarms"
  target_key_id = aws_kms_key.slo_alarms.key_id
}

resource "aws_sns_topic" "slo_alarms" {
  name              = var.slo_alarm_topic_name
  kms_master_key_id = aws_kms_key.slo_alarms.arn
}

data "aws_iam_policy_document" "slo_alarm_topic" {
  statement {
    sid     = "AllowCloudWatchAlarmsPublish"
    actions = ["sns:Publish"]
    resources = [
      aws_sns_topic.slo_alarms.arn,
    ]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }
  }
}

resource "aws_sns_topic_policy" "slo_alarms" {
  arn    = aws_sns_topic.slo_alarms.arn
  policy = data.aws_iam_policy_document.slo_alarm_topic.json
}

data "aws_iam_policy_document" "ecs_tasks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name                 = local.execution_role_name
  description          = "Launch-time ECS/Fargate execution role for pulling images, fetching secrets, and writing logs."
  assume_role_policy   = data.aws_iam_policy_document.ecs_tasks_assume_role.json
  permissions_boundary = var.permissions_boundary_arn

  lifecycle {
    ignore_changes = [permissions_boundary, tags, tags_all]
  }
}

data "aws_iam_policy_document" "execution_runtime_access" {
  statement {
    sid       = "GetEcrAuthorizationToken"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "ReadImageLayers"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
    ]
    resources = [
      local.core_case_pull_repository_arn,
      local.tax_engine_pull_repository_arn,
    ]
  }

  statement {
    sid = "WriteServiceLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    #tfsec:ignore:aws-iam-no-policy-wildcards ECS awslogs requires stream-level ARNs for the two service log groups.
    resources = [
      "${aws_cloudwatch_log_group.core_case.arn}:*",
      "${aws_cloudwatch_log_group.tax_engine.arn}:*",
    ]
  }
}

resource "aws_iam_role_policy" "execution_runtime_access" {
  name   = "${var.name_prefix}-ecs-task-runtime-access"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_runtime_access.json
}

data "aws_iam_policy_document" "execution_secret_access" {
  statement {
    sid       = "ReadSharedRuntimeConfigSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.shared_config_secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secret_access" {
  name   = "${var.name_prefix}-ecs-task-secret-access"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secret_access.json
}

resource "aws_iam_role" "core_case_task" {
  name                 = local.core_case_task_role_name
  description          = "Runtime task role for the Core Case Service application code."
  assume_role_policy   = data.aws_iam_policy_document.ecs_tasks_assume_role.json
  permissions_boundary = var.permissions_boundary_arn

  lifecycle {
    ignore_changes = [permissions_boundary, tags, tags_all]
  }
}

resource "aws_iam_role" "tax_engine_task" {
  name                 = local.tax_engine_task_role_name
  description          = "Runtime task role for the Tax Engine application code. No app-domain AWS grants are required yet."
  assume_role_policy   = data.aws_iam_policy_document.ecs_tasks_assume_role.json
  permissions_boundary = var.permissions_boundary_arn

  lifecycle {
    ignore_changes = [permissions_boundary, tags, tags_all]
  }
}

data "aws_iam_policy_document" "core_case_runtime_access" {
  statement {
    sid       = "PublishStageChangedEvents"
    actions   = ["sns:Publish"]
    resources = [var.stage_changed_topic_arn, var.action_item_created_topic_arn]
  }
}

resource "aws_iam_role_policy" "core_case_runtime_access" {
  name   = "${var.name_prefix}-core-case-runtime-access"
  role   = aws_iam_role.core_case_task.id
  policy = data.aws_iam_policy_document.core_case_runtime_access.json
}

data "aws_iam_policy_document" "xray_publish_access" {
  statement {
    sid = "WriteXRaySegments"
    actions = [
      "xray:PutTraceSegments",
      "xray:PutTelemetryRecords",
      "xray:GetSamplingRules",
      "xray:GetSamplingTargets",
      "xray:GetSamplingStatisticSummaries",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "core_case_xray_access" {
  name   = "${var.name_prefix}-core-case-xray-access"
  role   = aws_iam_role.core_case_task.id
  policy = data.aws_iam_policy_document.xray_publish_access.json
}

resource "aws_iam_role_policy" "tax_engine_xray_access" {
  name   = "${var.name_prefix}-tax-engine-xray-access"
  role   = aws_iam_role.tax_engine_task.id
  policy = data.aws_iam_policy_document.xray_publish_access.json
}

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb-sg"
  description = "Internet-facing HTTP ingress for the TaxPulse API ALB."
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  security_group_id = aws_security_group.alb.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_ingress_rule" "service_core_case" {
  security_group_id            = var.ecs_service_security_group_id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_ingress_rule" "service_tax_engine" {
  security_group_id            = var.ecs_service_security_group_id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
}

resource "aws_lb" "api" {
  name = local.alb_name
  #tfsec:ignore:aws-elb-alb-not-public SCRUM-158 requires an internet-facing API ALB; service ingress remains ALB-only.
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.public_subnet_ids
  ip_address_type            = "ipv4"
  drop_invalid_header_fields = true

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group" "core_case" {
  name        = local.core_case_target_group_name
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_target_group" "tax_engine" {
  name        = local.tax_engine_target_group_name
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    protocol            = "HTTP"
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
    matcher             = "200"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  #tfsec:ignore:aws-elb-http-not-used SCRUM-158 currently defines HTTP ALB routing; HTTPS certificate ownership is a later hardening concern.
  protocol = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      status_code  = "404"
      content_type = "application/json"
      message_body = jsonencode({ error = "route_not_found" })
    }
  }
}

resource "aws_lb_listener_rule" "core_case" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.core_case.arn
  }

  condition {
    path_pattern {
      values = ["/v1/*", "/auth/*"]
    }
  }
}

resource "aws_lb_listener_rule" "tax_engine" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tax_engine.arn
  }

  condition {
    path_pattern {
      values = [
        "/tax-calculations",
        "/tax-calculations/*",
        "/scenarios/comparisons",
        "/scenarios/comparisons/*",
      ]
    }
  }
}

resource "aws_service_discovery_private_dns_namespace" "service" {
  name        = local.service_discovery_namespace
  description = "Private DNS namespace for TaxPulse ECS service-to-service calls."
  vpc         = var.vpc_id
}

resource "aws_service_discovery_service" "tax_engine" {
  name = "tax-engine"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.service.id

    dns_records {
      ttl  = 10
      type = "A"
    }

    routing_policy = "MULTIVALUE"
  }
}

resource "aws_ecs_cluster" "api" {
  name = local.cluster_name
}

resource "aws_ecs_task_definition" "core_case" {
  family                   = local.core_case_family
  task_role_arn            = aws_iam_role.core_case_task.arn
  execution_role_arn       = aws_iam_role.execution.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"

  runtime_platform {
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = local.core_case_container_name
      image     = local.core_case_image
      essential = true
      portMappings = [
        {
          name          = "core-case-service-http"
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "JWT_ISSUER", value = var.jwt_issuer },
        { name = "JWT_JWKS_URL", value = "${var.jwt_issuer}/.well-known/jwks.json" },
        { name = "JWT_ACCESS_TOKEN_TTL_SECONDS", value = "900" },
        { name = "JWT_REFRESH_TOKEN_TTL_SECONDS", value = "2592000" },
        { name = "LIABILITY_ENGINE_BASE", value = "http://tax-engine.service.taxpulse.internal:8000" },
        { name = "TAXPULSE_LOGIN_BASE_DOMAIN", value = var.login_base_domain },
        { name = "TAXPULSE_REDIS_URL", value = var.redis_url },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "TAXPULSE_STAGE_CHANGED_TOPIC_ARN", value = var.stage_changed_topic_arn },
        { name = "TAXPULSE_STAGE_CHANGED_QUEUE_URL", value = var.stage_changed_queue_url },
        { name = "OTEL_SERVICE_NAME", value = "core-case-service" },
        { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = "http://127.0.0.1:4318" },
        { name = "OTEL_EXPORTER_OTLP_PROTOCOL", value = "http/protobuf" },
        { name = "OTEL_PROPAGATORS", value = "tracecontext,baggage,xray" },
        {
          name  = "OTEL_RESOURCE_ATTRIBUTES"
          value = "deployment.environment=${var.environment},service.namespace=taxpulse"
        },
        { name = "OTEL_TRACES_SAMPLER", value = "parentbased_traceidratio" },
        {
          name  = "OTEL_TRACES_SAMPLER_ARG"
          value = tostring(var.observability_trace_sampling_ratio)
        },
      ]
      dependsOn = [
        {
          containerName = local.collector_container_name
          condition     = "START"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${var.shared_config_secret_arn}:DATABASE_URL::"
        },
        {
          name      = "JWT_SIGNING_PRIVATE_KEY"
          valueFrom = "${var.shared_config_secret_arn}:JWT_SIGNING_PRIVATE_KEY::"
        },
        {
          name      = "JWT_SIGNING_KEY_ID"
          valueFrom = "${var.shared_config_secret_arn}:JWT_SIGNING_KEY_ID::"
        },
        {
          name      = "JWT_SIGNING_SECRET"
          valueFrom = "${var.shared_config_secret_arn}:JWT_SIGNING_SECRET::"
        },
        {
          name      = "ASSIST_TENANT_CORPUS_SCOPE_MAP"
          valueFrom = "${var.shared_config_secret_arn}:ASSIST_TENANT_CORPUS_SCOPE_MAP::"
        },
        {
          name      = "OPENAI_API_KEY"
          valueFrom = "${var.shared_config_secret_arn}:OPENAI_API_KEY::"
        },
      ]
      healthCheck = {
        command = [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:' + (process.env.PORT || '3000') + '/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))\"",
        ]
        interval    = 10
        timeout     = 3
        retries     = 5
        startPeriod = 20
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.core_case.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    },
    {
      name      = local.collector_container_name
      image     = var.collector_image
      essential = true
      command   = [local.collector_command]
      portMappings = [
        {
          containerPort = 4317
          hostPort      = 4317
          protocol      = "tcp"
        },
        {
          containerPort = 4318
          hostPort      = 4318
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "AWS_REGION", value = var.aws_region },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.core_case.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "otel"
        }
      }
    }
  ])
}

resource "aws_ecs_task_definition" "tax_engine" {
  family                   = local.tax_engine_family
  task_role_arn            = aws_iam_role.tax_engine_task.arn
  execution_role_arn       = aws_iam_role.execution.arn
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"

  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = local.tax_engine_container_name
      image     = local.tax_engine_image
      essential = true
      portMappings = [
        {
          name          = "tax-engine-http"
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]
      environment = [
        { name = "PORT", value = "8000" },
        { name = "JWT_ISSUER", value = var.jwt_issuer },
        { name = "JWT_JWKS_URL", value = "${var.jwt_issuer}/.well-known/jwks.json" },
        { name = "JWT_AUDIENCE", value = "taxpulse-http-api" },
        { name = "OTEL_SERVICE_NAME", value = "tax-engine" },
        { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = "http://127.0.0.1:4318" },
        { name = "OTEL_EXPORTER_OTLP_PROTOCOL", value = "http/protobuf" },
        { name = "OTEL_PROPAGATORS", value = "tracecontext,baggage,xray" },
        {
          name  = "OTEL_RESOURCE_ATTRIBUTES"
          value = "deployment.environment=${var.environment},service.namespace=taxpulse"
        },
        { name = "OTEL_TRACES_SAMPLER", value = "parentbased_traceidratio" },
        {
          name  = "OTEL_TRACES_SAMPLER_ARG"
          value = tostring(var.observability_trace_sampling_ratio)
        },
      ]
      dependsOn = [
        {
          containerName = local.collector_container_name
          condition     = "START"
        }
      ]
      secrets = [
        {
          name      = "JWT_SIGNING_SECRET"
          valueFrom = "${var.shared_config_secret_arn}:JWT_SIGNING_SECRET::"
        },
      ]
      healthCheck = {
        command = [
          "CMD-SHELL",
          "python -c \"import os, sys, urllib.request; port = os.environ.get('PORT', '8000'); url = f'http://127.0.0.1:{port}/health'; sys.exit(0 if urllib.request.urlopen(url, timeout=2).status == 200 else 1)\"",
        ]
        interval    = 10
        timeout     = 3
        retries     = 5
        startPeriod = 20
      }
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.tax_engine.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    },
    {
      name      = local.collector_container_name
      image     = var.collector_image
      essential = true
      command   = [local.collector_command]
      portMappings = [
        {
          containerPort = 4317
          hostPort      = 4317
          protocol      = "tcp"
        },
        {
          containerPort = 4318
          hostPort      = 4318
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "AWS_REGION", value = var.aws_region },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.tax_engine.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "otel"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "core_case" {
  name                              = local.core_case_service_name
  cluster                           = aws_ecs_cluster.api.id
  task_definition                   = aws_ecs_task_definition.core_case.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    # The sandbox SCP forbids NAT gateways. Fargate tasks therefore use public
    # subnets and public IPs for AWS service egress; inbound application traffic
    # remains restricted to the ALB security group.
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_service_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.core_case.arn
    container_name   = local.core_case_container_name
    container_port   = 3000
  }

  lifecycle {
    # The GitHub Actions release role deploys newer task definition revisions.
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener_rule.core_case]
}

resource "aws_ecs_service" "tax_engine" {
  name                              = local.tax_engine_service_name
  cluster                           = aws_ecs_cluster.api.id
  task_definition                   = aws_ecs_task_definition.tax_engine.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_service_security_group_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tax_engine.arn
    container_name   = local.tax_engine_container_name
    container_port   = 8000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.tax_engine.arn
  }

  lifecycle {
    # The GitHub Actions release role deploys newer task definition revisions.
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener_rule.tax_engine]
}

resource "aws_cloudwatch_metric_alarm" "tax_engine_latency_slo_risk" {
  alarm_name                            = "${local.slo_alarm_prefix}-tax-engine-latency-risk"
  alarm_description                     = "SCRUM-187 SLO risk: successful tax-engine requests exceed the 2 second p95 latency objective."
  comparison_operator                   = "GreaterThanThreshold"
  evaluation_periods                    = 5
  datapoints_to_alarm                   = 3
  evaluate_low_sample_count_percentiles = "ignore"
  threshold                             = 2000
  treat_missing_data                    = "notBreaching"
  alarm_actions                         = [aws_sns_topic.slo_alarms.arn]
  ok_actions                            = [aws_sns_topic.slo_alarms.arn]
  namespace                             = "TaxPulse"
  metric_name                           = "tax_plan_cycle.tax_engine_request.duration_ms"
  extended_statistic                    = "p95"
  period                                = 300

  dimensions = {
    service = "core-case-service"
  }
}

resource "aws_cloudwatch_metric_alarm" "core_case_availability_error_budget_burn" {
  alarm_name          = "${local.slo_alarm_prefix}-core-case-availability-error-budget-burn"
  alarm_description   = "SCRUM-187 SLO risk: Core Case ALB target 5xx rate exceeds the 0.1 percent error budget."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 5
  datapoints_to_alarm = 3
  threshold           = 0.001
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.slo_alarms.arn]
  ok_actions          = [aws_sns_topic.slo_alarms.arn]

  metric_query {
    id          = "error_rate"
    label       = "Core Case target 5xx error rate"
    expression  = "IF(requests > 0, errors / requests, 0)"
    return_data = true
  }

  metric_query {
    id = "errors"

    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "HTTPCode_Target_5XX_Count"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.api.arn_suffix
        TargetGroup  = aws_lb_target_group.core_case.arn_suffix
      }
    }
  }

  metric_query {
    id = "requests"

    metric {
      namespace   = "AWS/ApplicationELB"
      metric_name = "RequestCount"
      period      = 300
      stat        = "Sum"
      dimensions = {
        LoadBalancer = aws_lb.api.arn_suffix
        TargetGroup  = aws_lb_target_group.core_case.arn_suffix
      }
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "core_case_unhealthy_hosts" {
  alarm_name          = "${local.slo_alarm_prefix}-core-case-unhealthy-hosts"
  alarm_description   = "SCRUM-187 backing health alarm: the Core Case target group has no healthy targets."
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  treat_missing_data  = "breaching"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  statistic           = "Average"
  period              = 60

  dimensions = {
    LoadBalancer = aws_lb.api.arn_suffix
    TargetGroup  = aws_lb_target_group.core_case.arn_suffix
  }
}

resource "aws_cloudwatch_composite_alarm" "core_case_availability_slo_risk" {
  alarm_name        = "${local.slo_alarm_prefix}-core-case-availability-risk"
  alarm_description = "SCRUM-187 SLO risk: Core Case availability is burning error budget or has no healthy targets."
  alarm_actions     = [aws_sns_topic.slo_alarms.arn]
  ok_actions        = [aws_sns_topic.slo_alarms.arn]
  alarm_rule = join(
    " OR ",
    [
      "ALARM(${aws_cloudwatch_metric_alarm.core_case_availability_error_budget_burn.alarm_name})",
      "ALARM(${aws_cloudwatch_metric_alarm.core_case_unhealthy_hosts.alarm_name})",
    ],
  )
}
