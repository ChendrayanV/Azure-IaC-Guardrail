resource "azurerm_log_analytics_workspace" "this" {
  name                = var.log_analytics_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "PerGB2018"
  retention_in_days   = var.retention_days

  allow_resource_only_permissions = true
  local_authentication_enabled    = false
  internet_ingestion_enabled      = false
  internet_query_enabled          = false

  tags = var.tags
}

resource "azurerm_application_insights" "this" {
  name                = var.application_insights_name
  resource_group_name = var.resource_group_name
  location            = var.location
  workspace_id        = azurerm_log_analytics_workspace.this.id
  application_type    = "web"

  local_authentication_disabled         = true
  internet_ingestion_enabled            = false
  internet_query_enabled                = false
  sampling_percentage                   = 100
  daily_data_cap_in_gb                  = 10
  daily_data_cap_notifications_disabled = false

  tags = var.tags
}

resource "azurerm_monitor_action_group" "this" {
  name                = var.action_group_name
  resource_group_name = var.resource_group_name
  short_name          = substr(replace(var.action_group_name, "-", ""), 0, 12)
  enabled             = true
  tags                = var.tags

  dynamic "email_receiver" {
    for_each = var.alert_email_receivers
    content {
      name                    = email_receiver.value.name
      email_address           = email_receiver.value.email
      use_common_alert_schema = true
    }
  }
}

resource "azurerm_monitor_private_link_scoped_service" "logs" {
  name                = "ampls-${var.log_analytics_name}"
  resource_group_name = var.resource_group_name
  scope_name          = element(reverse(split("/", var.azure_monitor_private_link_scope_id)), 0)
  linked_resource_id  = azurerm_log_analytics_workspace.this.id
}

resource "azurerm_monitor_private_link_scoped_service" "application_insights" {
  name                = "ampls-${var.application_insights_name}"
  resource_group_name = var.resource_group_name
  scope_name          = element(reverse(split("/", var.azure_monitor_private_link_scope_id)), 0)
  linked_resource_id  = azurerm_application_insights.this.id
}

resource "azurerm_monitor_activity_log_alert" "resource_health" {
  name                = "alert-resource-health-${var.action_group_name}"
  resource_group_name = var.resource_group_name
  location            = "global"
  scopes              = ["/subscriptions/${var.subscription_id}"]
  description         = "Notify the application team when Azure Resource Health changes."
  enabled             = true

  criteria {
    category = "ResourceHealth"

    resource_health {
      current  = ["Available", "Degraded", "Unavailable", "Unknown"]
      previous = ["Available", "Degraded", "Unavailable", "Unknown"]
      reason   = ["PlatformInitiated", "UserInitiated", "Unknown"]
    }
  }

  action {
    action_group_id = azurerm_monitor_action_group.this.id
  }

  tags = var.tags
}
