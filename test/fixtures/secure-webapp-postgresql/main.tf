resource "azurerm_resource_group" "this" {
  name     = "rg-${local.resource_basename}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "this" {
  name                = "vnet-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  address_space       = ["10.70.0.0/16"]
  tags                = local.common_tags
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app-${var.environment}"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.70.1.0/24"]

  delegation {
    name = "app-service-delegation"

    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "database" {
  name                 = "snet-db-${var.environment}"
  resource_group_name  = azurerm_resource_group.this.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = ["10.70.2.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "postgresql-flexible-server-delegation"

    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_network_security_group" "database" {
  name                = "nsg-db-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = local.common_tags

  security_rule {
    name                       = "AllowPostgreSQLFromAppSubnet"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = "10.70.1.0/24"
    destination_address_prefix = "10.70.2.0/24"
  }
}

resource "azurerm_subnet_network_security_group_association" "database" {
  subnet_id                 = azurerm_subnet.database.id
  network_security_group_id = azurerm_network_security_group.database.id
}

resource "azurerm_private_dns_zone" "postgresql" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.this.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "pdnslink-${local.resource_basename}"
  resource_group_name   = azurerm_resource_group.this.name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.this.id
  registration_enabled  = false
  tags                  = local.common_tags
}

resource "azurerm_log_analytics_workspace" "this" {
  name                = "law-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.common_tags
}

resource "azurerm_application_insights" "this" {
  name                = "appi-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.this.id
  tags                = local.common_tags
}

resource "azurerm_service_plan" "web" {
  name                = "asp-${local.resource_basename}"
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  os_type             = "Linux"
  sku_name            = var.app_service_sku_name
  tags                = local.common_tags
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                          = "psql-${local.resource_basename}"
  resource_group_name           = azurerm_resource_group.this.name
  location                      = azurerm_resource_group.this.location
  version                       = var.postgresql_version
  delegated_subnet_id           = azurerm_subnet.database.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgresql.id
  public_network_access_enabled = false
  administrator_login           = var.database_admin_username
  administrator_password        = var.database_admin_password
  sku_name                      = var.postgresql_sku_name
  storage_mb                    = var.postgresql_storage_mb
  backup_retention_days         = var.environment == "production" ? 14 : 7
  geo_redundant_backup_enabled  = var.environment == "production"
  zone                          = "1"
  tags                          = local.common_tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgresql]
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_linux_web_app" "this" {
  name                      = "app-${local.resource_basename}"
  resource_group_name       = azurerm_resource_group.this.name
  location                  = azurerm_resource_group.this.location
  service_plan_id           = azurerm_service_plan.web.id
  https_only                = true
  virtual_network_subnet_id = azurerm_subnet.app.id
  tags                      = local.common_tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                         = var.app_service_sku_name == "F1" ? false : true
    ftps_state                        = "Disabled"
    health_check_path                 = "/health"
    http2_enabled                     = true
    minimum_tls_version               = "1.2"
    scm_minimum_tls_version           = "1.2"
    vnet_route_all_enabled            = true
    ip_restriction_default_action     = "Deny"
    scm_ip_restriction_default_action = "Deny"

    application_stack {
      docker_image_name   = "mcr.microsoft.com/appsvc/staticsite:latest"
      docker_registry_url = "https://mcr.microsoft.com"
    }

    dynamic "ip_restriction" {
      for_each = var.allowed_web_cidrs

      content {
        name       = "AllowWebIngress${ip_restriction.key}"
        priority   = 100 + tonumber(ip_restriction.key)
        action     = "Allow"
        ip_address = ip_restriction.value
      }
    }
  }

  app_settings = {
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.this.connection_string
    APPINSIGHTS_INSTRUMENTATIONKEY        = azurerm_application_insights.this.instrumentation_key
    DATABASE_HOST                         = azurerm_postgresql_flexible_server.this.fqdn
    DATABASE_NAME                         = azurerm_postgresql_flexible_server_database.app.name
    DATABASE_PORT                         = "5432"
    DATABASE_SSLMODE                      = "require"
    POSTGRESQLCONNSTR_AppDatabase         = "host=${azurerm_postgresql_flexible_server.this.fqdn} port=5432 dbname=${azurerm_postgresql_flexible_server_database.app.name} user=${var.database_admin_username} password=${var.database_admin_password} sslmode=require"
    WEBSITES_PORT                         = "8080"
  }
}

resource "azurerm_monitor_diagnostic_setting" "web_app" {
  name                       = "diag-${azurerm_linux_web_app.this.name}"
  target_resource_id         = azurerm_linux_web_app.this.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}

resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  name                       = "diag-${azurerm_postgresql_flexible_server.this.name}"
  target_resource_id         = azurerm_postgresql_flexible_server.this.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id

  enabled_log {
    category = "PostgreSQLLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
