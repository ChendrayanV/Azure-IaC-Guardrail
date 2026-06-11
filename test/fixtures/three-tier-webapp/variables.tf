variable "subscription_id" {
  description = "Azure subscription ID used by the AzureRM provider."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used by the AzureRM provider."
  type        = string
}

variable "location" {
  description = "Azure region for the deployment."
  type        = string
  default     = "uksouth"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

variable "name_prefix" {
  description = "Short lowercase prefix used to name resources."
  type        = string
  default     = "guardrail"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,18}$", var.name_prefix))
    error_message = "Name prefix must contain 3-18 lowercase letters, numbers, or hyphens."
  }
}

variable "web_sku_name" {
  description = "App Service plan SKU for the web tier."
  type        = string
  default     = "B1"
}

variable "app_sku_name" {
  description = "App Service plan SKU for the application tier."
  type        = string
  default     = "B1"
}

variable "database_sku_name" {
  description = "PostgreSQL Flexible Server compute SKU."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "database_admin_username" {
  description = "PostgreSQL administrator username."
  type        = string
  default     = "pgadminuser"
}

variable "database_admin_password" {
  description = "PostgreSQL administrator password supplied through a secure variable source."
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
