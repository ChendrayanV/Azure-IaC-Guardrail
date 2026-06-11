variable "subscription_id" {
  description = "Azure subscription ID used only when creating a resolved plan."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used only when creating a resolved plan."
  type        = string
}

variable "resource_group_name" {
  description = "Existing resource group name passed to the remote module."
  type        = string
}

variable "location" {
  description = "Azure region passed to the remote module."
  type        = string
}

variable "virtual_network_name" {
  description = "Virtual network name passed to the remote module."
  type        = string
}
