resource "aws_dynamodb_table" "plan_cycle_queue_projection" {
  name         = "taxpulse_${var.environment}_plan_cycle_queue_projection"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "tenant_id"
  range_key    = "case_id"

  attribute {
    name = "tenant_id"
    type = "S"
  }

  attribute {
    name = "case_id"
    type = "S"
  }

  tags = {
    Name        = "taxpulse-${var.environment}-plan-cycle-queue-projection"
    Environment = var.environment
  }
}
