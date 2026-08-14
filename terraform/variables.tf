variable "aws_region" {
  type        = string
  description = "The AWS region to deploy resources to."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "The environment name (e.g. dev, staging, prod)."
  default     = "dev"
}

variable "vpc_cidr" {
  type        = string
  description = "The CIDR block for the VPC."
  default     = "10.0.0.0/16"
}

variable "db_name" {
  type        = string
  description = "The name of the PostgreSQL database."
  default     = "taxpulse"
}

variable "db_username" {
  type        = string
  description = "The master username for the PostgreSQL database."
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "The master password for the PostgreSQL database."
  sensitive   = true
}
