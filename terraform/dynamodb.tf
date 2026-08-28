resource "aws_dynamodb_table" "plan_cycle_queue_projection" {
  name         = local.uses_legacy_dev_names ? "taxpulse_plan_cycle_queue_projection" : "${local.resource_name_prefix}-plan-cycle-queue-projection"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"
  range_key    = "case_id"

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "case_id"
    type = "S"
  }

  tags = {
    Name        = local.uses_legacy_dev_names ? "taxpulse_plan_cycle_queue_projection" : "${local.resource_name_prefix}-plan-cycle-queue-projection"
    Environment = var.environment
  }
}
