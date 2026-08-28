locals {
  delivery_redis_url = coalesce(
    var.redis_url,
    format(
      "rediss://%s:%d",
      aws_elasticache_replication_group.redis.primary_endpoint_address,
      aws_elasticache_replication_group.redis.port,
    ),
  )
}

module "events" {
  source = "./modules/events"

  environment = var.environment
  name_prefix = var.name_prefix
  user        = var.resource_owner
}

module "ecs_services" {
  source = "./modules/ecs_services"

  aws_region                         = var.aws_region
  environment                        = var.environment
  name_prefix                        = var.name_prefix
  vpc_id                             = aws_vpc.main.id
  public_subnet_ids                  = local.ordered_public_subnet_ids
  private_subnet_ids                 = local.ordered_private_subnet_ids
  ecs_service_security_group_id      = aws_security_group.ecs_service.id
  collector_image                    = "public.ecr.aws/aws-observability/aws-otel-collector:v0.30.0"
  log_retention_days                 = var.log_retention_days
  observability_trace_sampling_ratio = var.observability_trace_sampling_ratio

  core_case_image_tag             = var.core_case_image_tag
  tax_engine_image_tag            = var.tax_engine_image_tag
  core_case_image_uri             = var.core_case_image_uri
  tax_engine_image_uri            = var.tax_engine_image_uri
  core_case_image_repository_arn  = var.core_case_image_repository_arn
  tax_engine_image_repository_arn = var.tax_engine_image_repository_arn
  permissions_boundary_arn        = var.iam_permissions_boundary_arn

  shared_config_secret_arn      = local.runtime_config_secret_arn
  jwt_issuer                    = module.lambda_consumers.jwt_issuer
  login_base_domain             = var.login_base_domain
  redis_url                     = local.delivery_redis_url
  stage_changed_topic_arn       = module.events.stage_changed_topic_arn
  stage_changed_queue_url       = module.events.stage_changed_queue_url
  action_item_created_topic_arn = module.events.action_item_created_topic_arn
  slo_alarm_topic_name          = "${var.name_prefix}-${var.environment}-slo-alarms"
}

module "lambda_consumers" {
  source = "./modules/lambda_consumers"

  aws_region  = var.aws_region
  environment = var.environment
  name_prefix = var.name_prefix
  user        = var.resource_owner
  lambda_consumer_role_name = coalesce(
    var.lambda_consumer_role_name,
    "${local.resource_name_prefix}-transition-lambda-role",
  )

  present_to_client_lambda_zip_path = var.present_to_client_lambda_zip_path
  execute_lambda_zip_path           = var.execute_lambda_zip_path

  enable_stage_changed_consumer_lambda   = var.enable_stage_changed_consumer_lambda
  stage_changed_consumer_lambda_zip_path = var.stage_changed_consumer_lambda_zip_path
  issuer_metadata_lambda_zip_path        = var.issuer_metadata_lambda_zip_path
  stage_changed_queue_arn                = module.events.stage_changed_queue_arn
  projection_table_arn                   = aws_dynamodb_table.plan_cycle_queue_projection.arn
  projection_table_name                  = aws_dynamodb_table.plan_cycle_queue_projection.name

  stage_changed_topic_arn       = module.events.stage_changed_topic_arn
  action_item_created_topic_arn = module.events.action_item_created_topic_arn
  jwt_audience                  = var.jwt_audience
  jwt_public_jwk                = var.jwt_public_jwk
  permissions_boundary_arn      = var.iam_permissions_boundary_arn

  runtime_environment = merge(
    {
      TAXPULSE_STAGE_CHANGED_TOPIC_ARN           = module.events.stage_changed_topic_arn
      TAXPULSE_ACTION_ITEM_CREATED_TOPIC_ARN     = module.events.action_item_created_topic_arn
      TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE = aws_dynamodb_table.plan_cycle_queue_projection.name
    },
    var.lambda_runtime_environment,
  )
}

module "spa_delivery" {
  source = "./modules/spa_delivery"

  environment            = var.environment
  name_prefix            = var.name_prefix
  bucket_name            = var.spa_bucket_name
  api_origin_domain_name = module.ecs_services.api_origin_domain_name
}
