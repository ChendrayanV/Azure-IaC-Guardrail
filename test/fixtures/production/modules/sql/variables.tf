variable "server_name" { type = string }
variable "database_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "tenant_id" { type = string }
variable "entra_admin" {
  type = object({
    login_username = string
    object_id      = string
  })
}
variable "workload_principal_id" { type = string }
variable "sku_name" { type = string }
variable "max_size_gb" { type = number }
variable "zone_redundant" { type = bool }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
