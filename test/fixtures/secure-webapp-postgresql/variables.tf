variable "subscription_id" {
  description = "Azure subscription ID used by the AzureRM provider."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used by the AzureRM provider."
  type        = string
}

variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "uksouth"
}

variable "environment" {
  description = "Deployment environment name used for naming and tags."
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "test", "production"], var.environment)
    error_message = "Environment must be development, test, or production."
  }
}

variable "workload_name" {
  description = "Short workload name used in resource names."
  type        = string
  default     = "secure-web"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.workload_name))
    error_message = "Workload name must contain 3-24 lowercase letters, numbers, or hyphens."
  }
}

variable "name_suffix" {
  description = "Short suffix used to make globally unique resource names."
  type        = string
  default     = "001"

  validation {
    condition     = can(regex("^[a-z0-9]{3,8}$", var.name_suffix))
    error_message = "Name suffix must contain 3-8 lowercase letters or numbers."
  }
}

variable "app_service_sku_name" {
  description = "App Service plan SKU. Use lower SKUs for development and production-ready SKUs for production."
  type        = string
  default     = "B1"
}

variable "postgresql_sku_name" {
  description = "PostgreSQL Flexible Server compute SKU."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL Flexible Server storage size in MB."
  type        = number
  default     = 32768
}

variable "postgresql_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "16"
}

variable "database_name" {
  description = "Application database name."
  type        = string
  default     = "appdb"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,62}$", var.database_name))
    error_message = "Database name must start with a letter and contain 3-63 letters, numbers, or underscores."
  }
}

variable "database_admin_username" {
  description = "PostgreSQL administrator username."
  type        = string
  default     = "pgadminuser"

  validation {
    condition     = !contains(["azure_superuser", "admin", "administrator", "root", "guest", "public"], lower(var.database_admin_username))
    error_message = "Choose a PostgreSQL administrator username that is not reserved or overly privileged by convention."
  }
}

variable "database_admin_password" {
  description = "PostgreSQL administrator password supplied through a secure variable source."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.database_admin_password) >= 16
    error_message = "Database administrator password must be at least 16 characters."
  }
}

variable "allowed_web_cidrs" {
  description = "CIDR ranges allowed to reach the Web App over the public internet."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
