variable "name_prefix" {
  description = "Prefix used for event resource names."
  type        = string
  default     = "taxpulse"
}

variable "environment" {
  description = "Deployment environment included in resource names and tags."
  type        = string
  default     = "sandbox"
}

variable "user" {
  description = "User or owner included in resource tags."
  type        = string
  default     = "christopher-martus"
}

variable "tags" {
  description = "Additional tags applied to event resources."
  type        = map(string)
  default     = {}
}

variable "max_receive_count" {
  description = "Number of receives before a stage-changed message is moved to the DLQ."
  type        = number
  default     = 5
}
