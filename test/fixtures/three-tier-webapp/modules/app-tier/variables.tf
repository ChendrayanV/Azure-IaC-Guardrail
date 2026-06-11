variable "name" {
  description = "Application API name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the application tier."
  type        = string
}

variable "location" {
  description = "Azure region for the application tier."
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

variable "database_host" {
  description = "PostgreSQL server FQDN."
  type        = string
}

variable "database_name" {
  description = "Application database name."
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
  description = "Tags applied to application-tier resources."
  type        = map(string)
}
