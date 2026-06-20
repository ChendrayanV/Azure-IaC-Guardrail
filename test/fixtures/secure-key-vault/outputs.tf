output "key_vault_name" {
  description = "Name of the secure Key Vault."
  value       = azurerm_key_vault.this.name
}

output "key_vault_uri" {
  description = "URI of the secure Key Vault."
  value       = azurerm_key_vault.this.vault_uri
}

output "private_endpoint_id" {
  description = "ID of the Key Vault private endpoint."
  value       = azurerm_private_endpoint.key_vault.id
}

output "resource_group_name" {
  description = "Name of the resource group hosting the fixture."
  value       = azurerm_resource_group.this.name
}
