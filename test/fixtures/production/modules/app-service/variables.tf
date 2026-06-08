variable "plan_name" { type = string }
variable "app_name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "sku_name" { type = string }
variable "workload_identity_id" { type = string }
variable "workload_identity_client_id" { type = string }
variable "app_service_subnet_id" { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "private_dns_zone_id" { type = string }
variable "key_vault_uri" { type = string }
variable "storage_account_name" { type = string }
variable "sql_server_fqdn" { type = string }
variable "database_name" { type = string }
variable "application_insights_connection_string" {
  type      = string
  sensitive = true
}
variable "log_analytics_workspace_id" { type = string }
variable "action_group_id" { type = string }
variable "tags" { type = map(string) }
