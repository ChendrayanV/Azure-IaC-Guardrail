output "id" { value = azurerm_application_gateway.this.id }
output "backend_pool_id" {
  value = one([
    for pool in azurerm_application_gateway.this.backend_address_pool :
    pool.id if pool.name == "application"
  ])
}
output "identity_principal_id" { value = azurerm_user_assigned_identity.this.principal_id }
output "frontend_address" { value = var.private_frontend_ip }
