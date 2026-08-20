data "aws_caller_identity" "current" {}

locals {
  cluster_name                 = "${var.name_prefix}-api"
  core_case_family             = "${var.name_prefix}-core-case-service"
  tax_engine_family            = "${var.name_prefix}-tax-engine"
  core_case_container_name     = "core-case-service"
  tax_engine_container_name    = "tax-engine"
  core_case_repository_name    = "${var.name_prefix}/core-case-service"
  tax_engine_repository_name   = "${var.name_prefix}/tax-engine"
  core_case_log_group_name     = "Case-Service"
  tax_engine_log_group_name    = "Tax-Engine"
  execution_role_name          = "${var.name_prefix}-ecs-task-execution-role"
  core_case_task_role_name     = "${var.name_prefix}-core-case-task-role"
  tax_engine_task_role_name    = "${var.name_prefix}-tax-engine-task-role"
  alb_name                     = "${var.name_prefix}-api-alb"
  core_case_target_group_name  = "${var.name_prefix}-core-case"
  tax_engine_target_group_name = "${var.name_prefix}-tax-engine"
}

resource "aws_ecr_repository" "core_case" {
  name                 = local.core_case_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "tax_engine" {
  name                 = local.tax_engine_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "core_case" {
  repository = aws_ecr_repository.core_case.name
  policy     = file("${path.root}/../../deployment/ecr/lifecycle-policy.json")
}

resource "aws_ecr_lifecycle_policy" "tax_engine" {
  repository = aws_ecr_repository.tax_engine.name
  policy     = file("${path.root}/../../deployment/ecr/lifecycle-policy.json")
}

resource "aws_cloudwatch_log_group" "core_case" {
  name              = local.core_case_log_group_name
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "tax_engine" {
  name              = local.tax_engine_log_group_name
  retention_in_days = 30
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
  name               = local.execution_role_name
  description        = "Launch-time ECS/Fargate execution role for pulling images, fetching secrets, and writing logs."
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
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
  name               = local.core_case_task_role_name
  description        = "Runtime task role for the Core Case Service application code."
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role" "tax_engine_task" {
  name               = local.tax_engine_task_role_name
  description        = "Runtime task role for the Tax Engine application code."
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
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

resource "aws_security_group" "services" {
  name        = "${var.name_prefix}-ecs-services-sg"
  description = "ALB-only ingress for TaxPulse ECS services."
  vpc_id      = var.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "service_core_case" {
  security_group_id            = aws_security_group.services.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 3000
  to_port                      = 3000
}

resource "aws_vpc_security_group_ingress_rule" "service_tax_engine" {
  security_group_id            = aws_security_group.services.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
}

resource "aws_vpc_security_group_egress_rule" "services_all" {
  security_group_id = aws_security_group.services.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_lb" "api" {
  name               = local.alb_name
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
  ip_address_type    = "ipv4"
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
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

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
      values = ["/v1/*"]
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
      image     = "${aws_ecr_repository.core_case.repository_url}:${var.core_case_image_tag}"
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
        { name = "JWT_ACCESS_TOKEN_TTL_SECONDS", value = "900" },
        { name = "JWT_REFRESH_TOKEN_TTL_SECONDS", value = "2592000" },
        { name = "LIABILITY_ENGINE_BASE", value = "http://tax-engine.service.taxpulse.internal:8000" },
        { name = "TAXPULSE_LOGIN_BASE_DOMAIN", value = var.login_base_domain },
        { name = "TAXPULSE_REDIS_URL", value = var.redis_url },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "TAXPULSE_STAGE_CHANGED_TOPIC_ARN", value = var.stage_changed_topic_arn },
        { name = "TAXPULSE_STAGE_CHANGED_QUEUE_URL", value = var.stage_changed_queue_url },
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${var.shared_config_secret_arn}:DATABASE_URL::"
        },
        {
          name      = "JWT_SIGNING_SECRET"
          valueFrom = "${var.shared_config_secret_arn}:JWT_SIGNING_SECRET::"
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
    cpu_architecture        = "ARM64"
    operating_system_family = "LINUX"
  }

  container_definitions = jsonencode([
    {
      name      = local.tax_engine_container_name
      image     = "${aws_ecr_repository.tax_engine.repository_url}:${var.tax_engine_image_tag}"
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
    }
  ])
}

resource "aws_ecs_service" "core_case" {
  name                              = "core-case-service"
  cluster                           = aws_ecs_cluster.api.id
  task_definition                   = aws_ecs_task_definition.core_case.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.core_case.arn
    container_name   = local.core_case_container_name
    container_port   = 3000
  }

  depends_on = [aws_lb_listener_rule.core_case]
}

resource "aws_ecs_service" "tax_engine" {
  name                              = "tax-engine"
  cluster                           = aws_ecs_cluster.api.id
  task_definition                   = aws_ecs_task_definition.tax_engine.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tax_engine.arn
    container_name   = local.tax_engine_container_name
    container_port   = 8000
  }

  depends_on = [aws_lb_listener_rule.tax_engine]
}
