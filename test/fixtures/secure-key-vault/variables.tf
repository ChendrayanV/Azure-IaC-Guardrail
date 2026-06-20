variable "subscription_id" {
  description = "Azure subscription ID used by the AzureRM provider."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used by the AzureRM provider and Key Vault."
  type        = string
}

variable "current_user_object_id" {
  description = "Microsoft Entra object ID granted Key Vault Secrets Officer for fixture validation."
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
  default     = "secure-kv"

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

variable "key_vault_sku_name" {
  description = "Key Vault SKU. Use standard unless premium HSM-backed keys are required."
  type        = string
  default     = "premium"

  validation {
    condition     = contains(["standard", "premium"], var.key_vault_sku_name)
    error_message = "Key Vault SKU must be standard or premium."
  }
}

variable "private_endpoint_subnet_cidr" {
  description = "CIDR range for the private endpoint subnet."
  type        = string
  default     = "10.80.1.0/24"
}

variable "sample_secret_value" {
  description = "Sample secret value supplied through a secure variable source."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.sample_secret_value) >= 16
    error_message = "Sample secret value must be at least 16 characters."
  }
}

variable "tags" {
  description = "Additional tags applied to all resources."
  type        = map(string)
  default     = {}
}
