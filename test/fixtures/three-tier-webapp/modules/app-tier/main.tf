resource "azurerm_service_plan" "this" {
  name                = "plan-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.sku_name
  tags                = var.tags
}

resource "azurerm_linux_web_app" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.this.id

  https_only                                     = true
  public_network_access_enabled                  = false
  virtual_network_subnet_id                      = var.subnet_id
  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = false

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                               = true
    ftps_state                              = "Disabled"
    minimum_tls_version                     = "1.2"
    remote_debugging_enabled                = false
    vnet_route_all_enabled                  = true
    container_registry_use_managed_identity = true

    application_stack {
      dotnet_version = "8.0"
    }
  }

  app_settings = {
    DATABASE_HOST                         = var.database_host
    DATABASE_NAME                         = var.database_name
    APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
  }

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                       = "diag-${var.name}"
  target_resource_id         = azurerm_linux_web_app.this.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  enabled_log {
    category_group = "allLogs"
  }

  enabled_metric {
    category = "AllMetrics"
  }
}
