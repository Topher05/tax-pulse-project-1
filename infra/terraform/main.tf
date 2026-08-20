module "ecs_services" {
  source = "./modules/ecs_services"

  aws_region         = var.aws_region
  environment        = var.environment
  name_prefix        = var.name_prefix
  vpc_id             = var.vpc_id
  public_subnet_ids  = var.public_subnet_ids
  private_subnet_ids = var.private_subnet_ids

  core_case_image_tag           = var.core_case_image_tag
  tax_engine_image_tag          = var.tax_engine_image_tag
  shared_config_secret_arn      = var.shared_config_secret_arn
  jwt_issuer                    = var.jwt_issuer
  login_base_domain             = var.login_base_domain
  redis_url                     = var.redis_url
  stage_changed_topic_arn       = var.stage_changed_topic_arn
  stage_changed_queue_url       = var.stage_changed_queue_url
  action_item_created_topic_arn = var.action_item_created_topic_arn
}

module "lambda_consumers" {
  source = "./modules/lambda_consumers"

  aws_region               = var.aws_region
  environment              = var.environment
  name_prefix              = var.name_prefix
  shared_config_secret_arn = var.shared_config_secret_arn

  present_to_client_lambda_zip_path = var.present_to_client_lambda_zip_path
  execute_lambda_zip_path           = var.execute_lambda_zip_path

  enable_stage_changed_consumer_lambda   = var.enable_stage_changed_consumer_lambda
  stage_changed_consumer_lambda_zip_path = var.stage_changed_consumer_lambda_zip_path
  stage_changed_queue_arn                = var.stage_changed_queue_arn

  stage_changed_topic_arn       = var.stage_changed_topic_arn
  action_item_created_topic_arn = var.action_item_created_topic_arn

  runtime_environment = merge(
    {
      AWS_REGION                       = var.aws_region
      JWT_ISSUER                       = var.jwt_issuer
      TAXPULSE_STAGE_CHANGED_TOPIC_ARN = var.stage_changed_topic_arn
      TAXPULSE_ACTION_ITEM_TOPIC_ARN   = var.action_item_created_topic_arn
    },
    var.lambda_runtime_environment,
  )
}

module "spa_delivery" {
  source = "./modules/spa_delivery"

  environment = var.environment
  name_prefix = var.name_prefix
  bucket_name = var.spa_bucket_name
}
