resource "azurerm_postgresql_flexible_server" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "16"
  delegated_subnet_id           = var.delegated_subnet_id
  private_dns_zone_id           = var.private_dns_zone_id
  administrator_login           = var.administrator_login
  administrator_password        = var.administrator_password
  public_network_access_enabled = false
  sku_name                      = var.sku_name
  storage_mb                    = 32768
  backup_retention_days         = var.environment == "prod" ? 35 : 7
  geo_redundant_backup_enabled  = var.environment == "prod"

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
  }

  tags = var.tags
}

resource "azurerm_postgresql_flexible_server_database" "application" {
  name      = "application"
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}
