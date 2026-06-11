variable "name" {
  description = "Web application name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the web tier."
  type        = string
}

variable "location" {
  description = "Azure region for the web tier."
  type        = string
}

variable "subnet_id" {
  description = "Subnet used for regional VNet integration."
  type        = string
}

variable "sku_name" {
  description = "App Service plan SKU."
  type        = string
}

variable "app_tier_url" {
  description = "Application-tier hostname."
  type        = string
}

variable "application_insights_connection_string" {
  description = "Application Insights connection string."
  type        = string
  sensitive   = true
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace resource ID."
  type        = string
}

variable "tags" {
  description = "Tags applied to web-tier resources."
  type        = map(string)
}
