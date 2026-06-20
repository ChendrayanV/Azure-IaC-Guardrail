resource "azurerm_resource_group" "this" {
  name     = "rg-${local.resource_basename}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "this" {
  name                = "vnet-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  address_space       = ["10.80.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "private_endpoint" {
  name                              = "snet-pe-${var.environment}"
  resource_group_name               = azurerm_resource_group.this.name
  virtual_network_name              = azurerm_virtual_network.this.name
  address_prefixes                  = [var.private_endpoint_subnet_cidr]
  private_endpoint_network_policies = "Disabled"
}

resource "azurerm_network_security_group" "private_endpoint" {
  name                = "nsg-pe-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = local.common_tags

  security_rule {
    name                       = "DenyInternetInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "private_endpoint" {
  subnet_id                 = azurerm_subnet.private_endpoint.id
  network_security_group_id = azurerm_network_security_group.private_endpoint.id
}

resource "azurerm_private_dns_zone" "key_vault" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "key_vault" {
  name                  = "pdnslink-${local.resource_basename}"
  resource_group_name   = azurerm_resource_group.this.name
  private_dns_zone_name = azurerm_private_dns_zone.key_vault.name
  virtual_network_id    = azurerm_virtual_network.this.id
  registration_enabled  = false
  tags                  = local.common_tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "law-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "PerGB2018"
  retention_in_days   = var.environment == "production" ? 90 : 30
  tags                = local.common_tags
}

resource "azurerm_key_vault" "this" {
  name                          = local.key_vault_name
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  tenant_id                     = var.tenant_id
  sku_name                      = var.key_vault_sku_name
  public_network_access_enabled = false
  purge_protection_enabled      = true
  soft_delete_retention_days    = var.environment == "production" ? 90 : 30
  rbac_authorization_enabled    = true
  tags                          = local.common_tags

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }
}

resource "azurerm_private_endpoint" "key_vault" {
  name                = "pe-${local.resource_basename}-kv"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  subnet_id           = azurerm_subnet.private_endpoint.id
  tags                = local.common_tags

  private_service_connection {
    name                           = "psc-${local.resource_basename}-kv"
    private_connection_resource_id = azurerm_key_vault.this.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.key_vault.id]
  }
}

resource "azurerm_role_assignment" "current_user_secrets_officer" {
  scope                = azurerm_key_vault.this.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.current_user_object_id
}

resource "azurerm_key_vault_secret" "sample" {
  name         = "sample-application-secret"
  value        = var.sample_secret_value
  key_vault_id = azurerm_key_vault.this.id
  content_type = "fixture"
  tags         = local.common_tags

  depends_on = [azurerm_role_assignment.current_user_secrets_officer]
}

resource "azurerm_monitor_diagnostic_setting" "key_vault" {
  name                       = "diag-${azurerm_key_vault.this.name}"
  target_resource_id         = azurerm_key_vault.this.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  enabled_log {
    category = "AuditEvent"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
