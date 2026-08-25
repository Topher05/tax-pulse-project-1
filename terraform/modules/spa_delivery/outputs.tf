output "bucket_name" {
  description = "Private S3 bucket for SPA artifacts."
  value       = aws_s3_bucket.spa.bucket
}

output "bucket_regional_domain_name" {
  description = "S3 regional domain name used as the CloudFront origin."
  value       = aws_s3_bucket.spa.bucket_regional_domain_name
}

output "origin_access_control_id" {
  description = "CloudFront Origin Access Control ID."
  value       = aws_cloudfront_origin_access_control.spa.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for deploy invalidations."
  value       = aws_cloudfront_distribution.spa.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN used in the S3 bucket policy."
  value       = aws_cloudfront_distribution.spa.arn
}

output "spa_url" {
  description = "CloudFront HTTPS URL for the SPA."
  value       = "https://${aws_cloudfront_distribution.spa.domain_name}"
}
