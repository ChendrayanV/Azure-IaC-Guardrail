output "web_app_default_hostname" {
  description = "Default HTTPS hostname for the internet-facing Web App."
  value       = azurerm_linux_web_app.this.default_hostname
}

output "web_app_url" {
  description = "HTTPS URL for the internet-facing Web App."
  value       = "https://${azurerm_linux_web_app.this.default_hostname}"
}

output "postgresql_fqdn" {
  description = "Private PostgreSQL Flexible Server FQDN resolved from the integrated virtual network."
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

output "resource_group_name" {
  description = "Name of the resource group hosting the fixture."
  value       = azurerm_resource_group.this.name
}
