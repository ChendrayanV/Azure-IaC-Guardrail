variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "subnet_id" { type = string }
variable "sku" { type = string }
variable "admin_username" { type = string }
variable "ssh_public_key" {
  type = string

  validation {
    condition     = can(regex("^ssh-", var.ssh_public_key))
    error_message = "The VMSS SSH public key must use an OpenSSH public key format."
  }
}
variable "workload_identity_id" { type = string }
variable "application_gateway_backend_pool_ids" { type = list(string) }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
