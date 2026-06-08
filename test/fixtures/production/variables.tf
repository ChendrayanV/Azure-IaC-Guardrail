variable "subscription_id" {
  description = "Application landing-zone subscription ID."
  type        = string
  nullable    = false
}

variable "tenant_id" {
  description = "Microsoft Entra tenant ID."
  type        = string
  nullable    = false
}

variable "location" {
  description = "Azure region approved by the platform team."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string

  validation {
    condition     = contains(["development", "test", "staging", "production"], var.environment)
    error_message = "The environment must be development, test, staging, or production."
  }
}

variable "workload_name" {
  description = "Short lowercase workload identifier."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,18}$", var.workload_name))
    error_message = "The workload name must contain 3-18 lowercase letters, numbers, or hyphens."
  }
}

variable "unique_suffix" {
  description = "Globally unique lowercase suffix for globally named resources."
  type        = string
}

variable "resource_group_name" {
  description = "Application resource group name. The application team owns resources in this group."
  type        = string
}

variable "create_resource_group" {
  description = "Create the application resource group when it is not pre-provisioned."
  type        = bool
  default     = true
}

variable "deployment_model" {
  description = "Application runtime: app_service or vmss."
  type        = string
  default     = "app_service"

  validation {
    condition     = contains(["app_service", "vmss"], var.deployment_model)
    error_message = "The deployment model must be app_service or vmss."
  }
}

variable "network" {
  description = "Externally managed platform networking contract. This configuration never creates or changes these resources."
  type = object({
    virtual_network_id                  = string
    application_gateway_subnet_id       = string
    app_service_subnet_id               = string
    vmss_subnet_id                      = string
    private_endpoint_subnet_id          = string
    network_security_group_ids          = map(string)
    route_table_ids                     = map(string)
    azure_monitor_private_link_scope_id = string
    private_dns_zone_ids = object({
      app_service  = string
      key_vault    = string
      sql_server   = string
      storage_blob = string
    })
    application_gateway_public_ip_id = string
  })
}

variable "application_gateway_private_ip" {
  description = "Static private frontend address from the Application Gateway subnet."
  type        = string
}

variable "application_gateway_certificate_secret_id" {
  description = "Versionless Key Vault secret ID containing the ingress TLS certificate. No certificate material is stored in Terraform."
  type        = string
  sensitive   = true
}

variable "application_gateway_certificate_key_vault_id" {
  description = "Resource ID of the externally managed Key Vault containing the ingress certificate."
  type        = string
}

variable "entra_sql_admin" {
  description = "Microsoft Entra administrator for Azure SQL."
  type = object({
    login_username = string
    object_id      = string
  })
}

variable "vmss_admin_username" {
  description = "Administrative username used only when deployment_model is vmss."
  type        = string
  default     = "azureadmin"
}

variable "vmss_ssh_public_key" {
  description = "SSH public key used only for VMSS. Private keys are never accepted."
  type        = string
  default     = ""
}

variable "app_service_sku" {
  description = "App Service plan SKU."
  type        = string
  default     = "P1v3"
}

variable "vmss_sku" {
  description = "Virtual Machine Scale Set SKU."
  type        = string
  default     = "Standard_D2s_v5"
}

variable "sql_database_sku" {
  description = "Azure SQL Database SKU."
  type        = string
  default     = "GP_S_Gen5_2"
}

variable "sql_database_max_size_gb" {
  description = "Maximum Azure SQL Database size."
  type        = number
  default     = 32
}

variable "log_analytics_retention_days" {
  description = "Log Analytics retention."
  type        = number
  default     = 90
}

variable "alert_email_receivers" {
  description = "Azure Monitor action group email receivers."
  type = map(object({
    name  = string
    email = string
  }))
  default = {}
}

variable "tags" {
  description = "Enterprise tags added to all taggable application resources."
  type        = map(string)
}
