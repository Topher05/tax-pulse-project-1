locals {
  resource_prefix = "${var.name_prefix}-${var.environment}"
  tags = merge(var.tags, {
    env  = "sandbox"
    user = var.user
  })
}

resource "aws_sns_topic" "stage_changed" {
  name = "${local.resource_prefix}-stage-changed"
  tags = local.tags
}

resource "aws_sns_topic" "action_item_created" {
  name                        = "${local.resource_prefix}-action-item-created.fifo"
  fifo_topic                  = true
  content_based_deduplication = true
  tags                        = local.tags
}

resource "aws_sqs_queue" "stage_changed_dlq" {
  name                      = "${local.resource_prefix}-stage-changed-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
  tags                      = local.tags
}

resource "aws_sqs_queue" "stage_changed" {
  name                    = "${local.resource_prefix}-stage-changed"
  sqs_managed_sse_enabled = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.stage_changed_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = local.tags
}

resource "aws_sns_topic_subscription" "stage_changed_to_queue" {
  topic_arn            = aws_sns_topic.stage_changed.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.stage_changed.arn
  raw_message_delivery = true
}

data "aws_iam_policy_document" "stage_changed_queue" {
  statement {
    sid    = "AllowStageChangedTopic"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.stage_changed.arn]

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_sns_topic.stage_changed.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "stage_changed" {
  queue_url = aws_sqs_queue.stage_changed.id
  policy    = data.aws_iam_policy_document.stage_changed_queue.json
}
