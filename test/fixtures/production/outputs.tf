output "resource_group_id" {
  value = data.azurerm_resource_group.this.id
}

output "application_gateway_id" {
  value = module.application_gateway.id
}

output "application_endpoint" {
  value = "https://${module.application_gateway.frontend_address}"
}

output "application_identity_client_id" {
  value = module.identity.client_id
}

output "key_vault_uri" {
  value = module.key_vault.vault_uri
}

output "storage_account_name" {
  value = module.storage.name
}

output "sql_server_fqdn" {
  value = module.sql.server_fqdn
}

output "log_analytics_workspace_id" {
  value = module.observability.log_analytics_workspace_id
}

output "application_insights_connection_string" {
  value     = module.observability.application_insights_connection_string
  sensitive = true
}
