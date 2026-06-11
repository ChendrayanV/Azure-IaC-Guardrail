output "virtual_network_id" {
  description = "Virtual network resource ID."
  value       = azurerm_virtual_network.this.id
}

output "web_subnet_id" {
  description = "Web-tier integration subnet ID."
  value       = azurerm_subnet.web.id
}

output "app_subnet_id" {
  description = "Application-tier integration subnet ID."
  value       = azurerm_subnet.app.id
}

output "data_subnet_id" {
  description = "Database delegated subnet ID."
  value       = azurerm_subnet.data.id
}

output "postgresql_private_dns_zone_id" {
  description = "PostgreSQL private DNS zone ID."
  value       = azurerm_private_dns_zone.postgresql.id
}
