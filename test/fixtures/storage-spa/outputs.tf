output "spa_url" {
  description = "Public URL of the Azure Storage static website."
  value       = azurerm_storage_account.spa.primary_web_endpoint
}

output "storage_account_name" {
  description = "Name of the storage account hosting the SPA."
  value       = azurerm_storage_account.spa.name
}
