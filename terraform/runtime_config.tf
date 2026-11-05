locals {
  manage_runtime_config_secret = var.shared_config_secret_arn == null
  runtime_config_secret_arn = coalesce(
    var.shared_config_secret_arn,
    try(aws_secretsmanager_secret.runtime_config[0].arn, null),
  )
}

resource "aws_secretsmanager_secret" "runtime_config" {
  count = local.manage_runtime_config_secret ? 1 : 0

  name                    = "${local.resource_name_prefix}-runtime-config"
  description             = "Runtime configuration for the Terraform-managed TaxPulse stack."
  recovery_window_in_days = 7

  tags = {
    Name        = "${local.resource_name_prefix}-runtime-config"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "runtime_config" {
  count = local.manage_runtime_config_secret ? 1 : 0

  secret_id = aws_secretsmanager_secret.runtime_config[0].id
  secret_string = jsonencode({
    DATABASE_URL = format(
      # RDS requires encrypted transport. The container images do not include
      # the Amazon RDS CA bundle, so pg uses libpq-compatible required TLS.
      "postgresql://%s:%s@%s:%d/%s?sslmode=require&uselibpqcompat=true",
      var.db_username,
      urlencode(var.db_password),
      aws_db_instance.postgres.address,
      aws_db_instance.postgres.port,
      var.db_name,
    )
    # Keep PEM serialization stable across Windows and Unix workstations so a
    # line-ending-only difference does not create a new secret version.
    JWT_SIGNING_PRIVATE_KEY        = replace(var.jwt_signing_private_key, "\r\n", "\n")
    JWT_SIGNING_KEY_ID             = var.jwt_signing_key_id
    JWT_SIGNING_SECRET             = var.jwt_signing_secret
    ASSIST_TENANT_CORPUS_SCOPE_MAP = var.assist_tenant_corpus_scope_map
    OPENAI_API_KEY                 = var.openai_api_key
  })

  lifecycle {
    precondition {
      condition = (
        var.jwt_signing_private_key != null &&
        length(trimspace(var.jwt_signing_private_key)) > 0 &&
        var.jwt_signing_key_id != null &&
        var.jwt_signing_secret != null &&
        length(trimspace(var.jwt_signing_secret)) > 0 &&
        var.assist_tenant_corpus_scope_map != null &&
        length(trimspace(var.assist_tenant_corpus_scope_map)) > 0 &&
        var.openai_api_key != null &&
        length(trimspace(var.openai_api_key)) > 0
      )
      error_message = "Set the JWT and AI Assist runtime values when Terraform manages the runtime secret."
    }
  }
}
