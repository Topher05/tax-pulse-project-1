locals {
  github_actions_oidc_provider_url        = "https://token.actions.githubusercontent.com"
  github_actions_oidc_provider_host       = "token.actions.githubusercontent.com"
  github_actions_development_subject      = "repo:${var.github_actions_repository}:ref:refs/heads/${var.github_actions_release_branch}"
  github_actions_release_role_name        = "${var.name_prefix}-github-actions-release-role"
  github_actions_release_role_description = "Short-lived GitHub Actions release role for ECR publication, Cosign verification, and ECS deployment."
  github_actions_release_service_arns = [
    format(
      "arn:aws:ecs:%s:%s:service/%s/%s",
      var.aws_region,
      data.aws_caller_identity.current.account_id,
      module.ecs_services.cluster_name,
      module.ecs_services.core_case_service_name,
    ),
    format(
      "arn:aws:ecs:%s:%s:service/%s/%s",
      var.aws_region,
      data.aws_caller_identity.current.account_id,
      module.ecs_services.cluster_name,
      module.ecs_services.tax_engine_service_name,
    ),
  ]
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = local.github_actions_oidc_provider_url
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  lifecycle {
    ignore_changes = [tags, tags_all]
  }
}

data "aws_iam_policy_document" "github_actions_release_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_actions_oidc_provider_host}:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.github_actions_oidc_provider_host}:sub"
      values   = [local.github_actions_development_subject]
    }
  }
}

resource "aws_iam_role" "github_actions_release" {
  name                 = local.github_actions_release_role_name
  description          = local.github_actions_release_role_description
  assume_role_policy   = data.aws_iam_policy_document.github_actions_release_assume_role.json
  permissions_boundary = var.iam_permissions_boundary_arn

  lifecycle {
    ignore_changes = [permissions_boundary, tags, tags_all]
  }
}

data "aws_iam_policy_document" "github_actions_release" {
  statement {
    sid       = "GetEcrAuthorizationToken"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "PushAndReadReleaseImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [
      module.ecs_services.core_case_repository_arn,
      module.ecs_services.tax_engine_repository_arn,
    ]
  }

  statement {
    sid = "DescribeAndUpdateEcsServices"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
    ]
    resources = local.github_actions_release_service_arns
  }

  statement {
    sid = "RegisterAndDescribeTaskDefinitions"
    actions = [
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
    ]
    resources = ["*"]
  }

  statement {
    sid = "PassExistingTaskRoles"
    actions = [
      "iam:GetRole",
      "iam:PassRole",
    ]
    resources = [
      module.ecs_services.execution_role_arn,
      module.ecs_services.core_case_task_role_arn,
      module.ecs_services.tax_engine_task_role_arn,
    ]
  }
}

resource "aws_iam_role_policy" "github_actions_release" {
  name   = "${local.github_actions_release_role_name}Policy"
  role   = aws_iam_role.github_actions_release.id
  policy = data.aws_iam_policy_document.github_actions_release.json
}
