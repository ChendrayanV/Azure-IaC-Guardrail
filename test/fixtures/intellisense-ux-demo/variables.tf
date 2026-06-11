variable "subscription_id" {
  description = "Azure subscription ID used only for a resolved plan."
  type        = string
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID used only for a resolved plan."
  type        = string
}

variable "public_network_access_enabled" {
  description = "Controls whether the web app accepts public network traffic."
  type        = bool
}

variable "remote_debugging_enabled" {
  description = "Controls whether remote debugging is enabled."
  type        = bool
}
