variable "environment" {
  description = "Environment label used in generated names."
  type        = string
}

variable "name_prefix" {
  description = "Name prefix for SPA delivery resources."
  type        = string
}

variable "bucket_name" {
  description = "Optional globally-unique S3 bucket name for the private SPA origin."
  type        = string
  default     = null
}
