variable "subscription_id" {
  description = "Azure subscription ID used by the AzureRM provider."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used by the AzureRM provider."
  type        = string
}

variable "location" {
  description = "Azure region for the resource group and storage account."
  type        = string
  default     = "uksouth"
}

variable "resource_group_name" {
  description = "Name of the resource group that hosts the SPA."
  type        = string
  default     = "rg-storage-spa-dev"
}

variable "storage_account_name" {
  description = "Globally unique storage account name using 3-24 lowercase letters and numbers."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "The storage account name must contain 3-24 lowercase letters and numbers."
  }
}

variable "tags" {
  description = "Tags applied to the resource group and storage account."
  type        = map(string)
  default = {
    environment = "development"
    workload    = "storage-spa"
    managed-by  = "terraform"
  }
}
