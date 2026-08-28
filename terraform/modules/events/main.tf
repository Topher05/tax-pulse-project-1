locals {
  resource_prefix = "${var.name_prefix}-${var.environment}"
  tags = merge(var.tags, {
    env  = "sandbox"
    user = var.user
  })
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "sns" {
  statement {
    sid       = "AllowAccountAdministration"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid       = "AllowSnsTopicEncryption"
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key" "sns" {
  description             = "Customer-managed key for TaxPulse SNS topic encryption."
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                    = local.tags
}

resource "aws_kms_key_policy" "sns" {
  key_id = aws_kms_key.sns.id
  policy = data.aws_iam_policy_document.sns.json
}

resource "aws_kms_alias" "sns" {
  name          = "alias/${local.resource_prefix}-sns"
  target_key_id = aws_kms_key.sns.key_id
}

resource "aws_sns_topic" "stage_changed" {
  name              = "${local.resource_prefix}-stage-changed"
  kms_master_key_id = aws_kms_key.sns.arn
  tags              = local.tags
}

resource "aws_sns_topic" "action_item_created" {
  name                        = "${local.resource_prefix}-action-item-created.fifo"
  fifo_topic                  = true
  content_based_deduplication = true
  kms_master_key_id           = aws_kms_key.sns.arn
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
  # Lambda requires the source queue visibility timeout to exceed its 60-second timeout.
  visibility_timeout_seconds = 360

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.stage_changed_dlq.arn
    maxReceiveCount     = var.max_receive_count
  })

  tags = local.tags
}

resource "aws_sns_topic_subscription" "stage_changed_to_queue" {
  topic_arn = aws_sns_topic.stage_changed.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.stage_changed.arn
  # The SQS projection consumer validates the standard SNS notification envelope.
  raw_message_delivery = false
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
