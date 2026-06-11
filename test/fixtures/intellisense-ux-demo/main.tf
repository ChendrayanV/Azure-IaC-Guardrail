resource "azurerm_linux_web_app" "demo" {
  name                = "app-guardrail-intellisense-demo"
  resource_group_name = "rg-guardrail-intellisense-demo"
  location            = "uksouth"
  service_plan_id     = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-guardrail-intellisense-demo/providers/Microsoft.Web/serverfarms/plan-demo"

  https_only                                     = true
  public_network_access_enabled                  = var.public_network_access_enabled
  virtual_network_subnet_id                      = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-demo/subnets/snet-app"
  webdeploy_publish_basic_authentication_enabled = false

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                = true
    minimum_tls_version      = "1.0"
    remote_debugging_enabled = var.remote_debugging_enabled

    application_stack {
      dotnet_version = "8.0"
    }
  }

  tags = {
    environment = "development"
    workload    = "intellisense-ux-demo"
    managed-by  = "terraform"
  }
}
