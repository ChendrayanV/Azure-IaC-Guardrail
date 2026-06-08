resource "azurerm_service_plan" "this" {
  name                = var.plan_name
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.sku_name
  worker_count        = 2

  premium_plan_auto_scale_enabled = true
  zone_balancing_enabled          = true

  tags = var.tags
}

resource "azurerm_linux_web_app" "this" {
  name                = var.app_name
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.this.id

  https_only                                     = true
  public_network_access_enabled                  = false
  client_affinity_enabled                        = false
  ftp_publish_basic_authentication_enabled       = false
  webdeploy_publish_basic_authentication_enabled = false
  virtual_network_subnet_id                      = var.app_service_subnet_id
  key_vault_reference_identity_id                = var.workload_identity_id

  identity {
    type         = "UserAssigned"
    identity_ids = [var.workload_identity_id]
  }

  app_settings = {
    AZURE_CLIENT_ID                            = var.workload_identity_client_id
    KEY_VAULT_URI                              = var.key_vault_uri
    STORAGE_ACCOUNT_NAME                       = var.storage_account_name
    SQL_SERVER_FQDN                            = var.sql_server_fqdn
    SQL_DATABASE_NAME                          = var.database_name
    APPLICATIONINSIGHTS_CONNECTION_STRING      = var.application_insights_connection_string
    ApplicationInsightsAgent_EXTENSION_VERSION = "~3"
  }

  site_config {
    always_on                         = true
    ftps_state                        = "Disabled"
    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 5
    http2_enabled                     = true
    ip_restriction_default_action     = "Deny"
    minimum_tls_version               = "1.3"
    remote_debugging_enabled          = false
    scm_ip_restriction_default_action = "Deny"
    scm_minimum_tls_version           = "1.2"
    scm_use_main_ip_restriction       = true
    use_32_bit_worker                 = false
    vnet_route_all_enabled            = true

    application_stack {
      node_version = "22-lts"
    }
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "this" {
  name                = "pe-${var.app_name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-${var.app_name}"
    private_connection_resource_id = azurerm_linux_web_app.this.id
    subresource_names              = ["sites"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "app-service"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                           = "diag-${var.app_name}"
  target_resource_id             = azurerm_linux_web_app.this.id
  log_analytics_workspace_id     = var.log_analytics_workspace_id
  log_analytics_destination_type = "Dedicated"

  enabled_log { category_group = "allLogs" }
  enabled_metric { category = "AllMetrics" }
}

resource "azurerm_monitor_metric_alert" "http_5xx" {
  name                = "alert-${var.app_name}-http5xx"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_linux_web_app.this.id]
  description         = "App Service is returning elevated HTTP 5xx responses."
  severity            = 1
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "Http5xx"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 5
  }

  action {
    action_group_id = var.action_group_id
  }
}
