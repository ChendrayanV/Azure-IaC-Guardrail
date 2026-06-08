resource "azurerm_user_assigned_identity" "this" {
  name                = "id-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_web_application_firewall_policy" "this" {
  name                = "waf-${var.name}"
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    file_upload_limit_in_mb     = 100
    max_request_body_size_in_kb = 128
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }

    managed_rule_set {
      type    = "Microsoft_BotManagerRuleSet"
      version = "1.1"
    }
  }
}

resource "azurerm_application_gateway" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  firewall_policy_id  = azurerm_web_application_firewall_policy.this.id
  http2_enabled       = true
  fips_enabled        = true
  zones               = ["1", "2", "3"]
  tags                = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.this.id]
  }

  sku {
    name = "WAF_v2"
    tier = "WAF_v2"
  }

  autoscale_configuration {
    min_capacity = 2
    max_capacity = 10
  }

  gateway_ip_configuration {
    name      = "gateway"
    subnet_id = var.subnet_id
  }

  frontend_ip_configuration {
    name                          = "private"
    private_ip_address            = var.private_frontend_ip
    private_ip_address_allocation = "Static"
    subnet_id                     = var.subnet_id
  }

  dynamic "frontend_ip_configuration" {
    for_each = var.public_ip_address_id == null ? [] : [var.public_ip_address_id]
    content {
      name                 = "public"
      public_ip_address_id = frontend_ip_configuration.value
    }
  }

  frontend_port {
    name = "https"
    port = 443
  }

  ssl_certificate {
    name                = "ingress"
    key_vault_secret_id = var.certificate_secret_id
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101S"
  }

  backend_address_pool {
    name  = "application"
    fqdns = var.backend_fqdns
  }

  probe {
    name                                      = "health"
    protocol                                  = var.backend_protocol
    path                                      = "/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = length(var.backend_fqdns) > 0

    match {
      status_code = ["200-399"]
    }
  }

  backend_http_settings {
    name                                = "https"
    protocol                            = var.backend_protocol
    port                                = var.backend_port
    cookie_based_affinity               = "Disabled"
    request_timeout                     = 30
    probe_name                          = "health"
    pick_host_name_from_backend_address = length(var.backend_fqdns) > 0
  }

  http_listener {
    name                           = "https"
    frontend_ip_configuration_name = var.public_ip_address_id == null ? "private" : "public"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "ingress"
    require_sni                    = false
  }

  request_routing_rule {
    name                       = "application"
    rule_type                  = "Basic"
    http_listener_name         = "https"
    backend_address_pool_name  = "application"
    backend_http_settings_name = "https"
    priority                   = 100
  }
}

resource "azurerm_monitor_diagnostic_setting" "this" {
  name                           = "diag-${var.name}"
  target_resource_id             = azurerm_application_gateway.this.id
  log_analytics_workspace_id     = var.log_analytics_workspace_id
  log_analytics_destination_type = "Dedicated"

  enabled_log { category_group = "allLogs" }
  enabled_metric { category = "AllMetrics" }
}
