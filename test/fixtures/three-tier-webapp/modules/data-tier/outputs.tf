output "id" {
  description = "PostgreSQL Flexible Server resource ID."
  value       = azurerm_postgresql_flexible_server.this.id
}

output "fqdn" {
  description = "PostgreSQL Flexible Server FQDN."
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

output "database_name" {
  description = "Application database name."
  value       = azurerm_postgresql_flexible_server_database.application.name
}
