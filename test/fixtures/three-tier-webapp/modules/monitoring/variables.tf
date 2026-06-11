variable "name" {
  description = "Monitoring resource name suffix."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing monitoring resources."
  type        = string
}

variable "location" {
  description = "Azure region for monitoring resources."
  type        = string
}

variable "tags" {
  description = "Tags applied to monitoring resources."
  type        = map(string)
}
