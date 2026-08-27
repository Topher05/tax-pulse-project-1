data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  bucket_name = coalesce(
    var.bucket_name,
    "${var.name_prefix}-${var.environment}-${data.aws_caller_identity.current.account_id}-spa",
  )
  origin_id = "${var.name_prefix}-spa-s3-origin"
  # AWS-managed CloudFront policy; avoids creating a custom no-cache policy.
  api_cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
}

resource "aws_kms_key" "spa" {
  description             = "KMS key for TaxPulse SPA S3 origin encryption."
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

data "aws_iam_policy_document" "spa_kms" {
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
    sid    = "AllowCloudFrontOriginAccessControlDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.spa.arn]
    }
  }
}

resource "aws_kms_key_policy" "spa" {
  key_id = aws_kms_key.spa.id
  policy = data.aws_iam_policy_document.spa_kms.json
}

resource "aws_kms_alias" "spa" {
  name          = "alias/${var.name_prefix}-${var.environment}-spa"
  target_key_id = aws_kms_key.spa.key_id
}

resource "aws_s3_bucket" "spa" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_public_access_block" "spa" {
  bucket = aws_s3_bucket.spa.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "spa" {
  bucket = aws_s3_bucket.spa.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "spa" {
  bucket = aws_s3_bucket.spa.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.spa.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_versioning" "spa" {
  bucket = aws_s3_bucket.spa.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${var.name_prefix}-spa-origin-access-control"
  description                       = "CloudFront-only access for the private TaxPulse SPA S3 origin."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.name_prefix}-${var.environment}-static-assets"
  comment     = "Cache policy for immutable TaxPulse SPA static assets."
  default_ttl = 86400
  max_ttl     = 31536000
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}

resource "aws_cloudfront_origin_request_policy" "api" {
  name    = "${var.name_prefix}-${var.environment}-api"
  comment = "Forward authentication and request metadata to the ALB API origin."

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Accept",
        "Authorization",
        "Content-Type",
        "Origin",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
      ]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_function" "spa_route_rewrite" {
  name    = "${var.name_prefix}-${var.environment}-spa-route-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  code = <<-EOT
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      if (uri.endsWith('/') || !uri.includes('.')) {
        request.uri = '/index.html';
      }
      return request;
    }
  EOT
}

#tfsec:ignore:aws-cloudfront-enable-waf WAF policy is owned by a later hardening ticket; SCRUM-161 only requires private S3 behind CloudFront.
resource "aws_cloudfront_distribution" "spa" {
  enabled             = true
  comment             = "TaxPulse SPA served from a private S3 origin behind CloudFront."
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  http_version        = "http2"
  is_ipv6_enabled     = true

  origin {
    origin_id                = local.origin_id
    domain_name              = aws_s3_bucket.spa.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  origin {
    origin_id   = "${var.name_prefix}-api-origin"
    domain_name = var.api_origin_domain_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = [
      "/auth/*",
      "/v1/*",
      "/tax-calculations*",
      "/scenarios/comparisons*",
    ]

    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "${var.name_prefix}-api-origin"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true
      cache_policy_id        = local.api_cache_policy_id
      origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
    }
  }

  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.static_assets.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_route_rewrite.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "cloudfront_read" {
  statement {
    sid     = "AllowCloudFrontReadOnly"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = ["${aws_s3_bucket.spa.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.spa.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id
  policy = data.aws_iam_policy_document.cloudfront_read.json
}
