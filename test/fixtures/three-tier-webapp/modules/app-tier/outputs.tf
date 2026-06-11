output "id" {
  description = "Application API resource ID."
  value       = azurerm_linux_web_app.this.id
}

output "default_hostname" {
  description = "Default application API hostname."
  value       = azurerm_linux_web_app.this.default_hostname
}

output "principal_id" {
  description = "Managed identity principal ID."
  value       = azurerm_linux_web_app.this.identity[0].principal_id
}
