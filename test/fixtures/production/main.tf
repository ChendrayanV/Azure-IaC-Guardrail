resource "azurerm_resource_group" "this" {
  count = var.create_resource_group ? 1 : 0

  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

data "azurerm_resource_group" "this" {
  name = local.resource_group_name

  depends_on = [azurerm_resource_group.this]
}

module "observability" {
  source = "./modules/observability"

  resource_group_name                 = data.azurerm_resource_group.this.name
  location                            = data.azurerm_resource_group.this.location
  log_analytics_name                  = local.names.log_analytics
  application_insights_name           = local.names.app_insights
  action_group_name                   = local.names.action_group
  subscription_id                     = var.subscription_id
  azure_monitor_private_link_scope_id = var.network.azure_monitor_private_link_scope_id
  retention_days                      = var.log_analytics_retention_days
  alert_email_receivers               = var.alert_email_receivers
  tags                                = local.common_tags
}

module "identity" {
  source = "./modules/identity"

  name                = local.names.identity
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location
  tags                = local.common_tags
}

module "key_vault" {
  source = "./modules/key-vault"

  name                       = local.names.key_vault
  resource_group_name        = data.azurerm_resource_group.this.name
  location                   = data.azurerm_resource_group.this.location
  tenant_id                  = var.tenant_id
  workload_principal_id      = module.identity.principal_id
  private_endpoint_subnet_id = var.network.private_endpoint_subnet_id
  private_dns_zone_id        = var.network.private_dns_zone_ids.key_vault
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  tags                       = local.common_tags
}

module "storage" {
  source = "./modules/storage"

  name                       = local.names.storage
  resource_group_name        = data.azurerm_resource_group.this.name
  location                   = data.azurerm_resource_group.this.location
  workload_principal_id      = module.identity.principal_id
  private_endpoint_subnet_id = var.network.private_endpoint_subnet_id
  private_dns_zone_id        = var.network.private_dns_zone_ids.storage_blob
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  tags                       = local.common_tags
}

module "sql" {
  source = "./modules/sql"

  server_name                = local.names.sql_server
  database_name              = local.names.sql_database
  resource_group_name        = data.azurerm_resource_group.this.name
  location                   = data.azurerm_resource_group.this.location
  tenant_id                  = var.tenant_id
  entra_admin                = var.entra_sql_admin
  workload_principal_id      = module.identity.principal_id
  sku_name                   = var.sql_database_sku
  max_size_gb                = var.sql_database_max_size_gb
  zone_redundant             = var.environment == "production"
  private_endpoint_subnet_id = var.network.private_endpoint_subnet_id
  private_dns_zone_id        = var.network.private_dns_zone_ids.sql_server
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  tags                       = local.common_tags
}

module "app_service" {
  count  = var.deployment_model == "app_service" ? 1 : 0
  source = "./modules/app-service"

  plan_name                              = local.names.app_service_plan
  app_name                               = local.names.web_app
  resource_group_name                    = data.azurerm_resource_group.this.name
  location                               = data.azurerm_resource_group.this.location
  sku_name                               = var.app_service_sku
  workload_identity_id                   = module.identity.id
  workload_identity_client_id            = module.identity.client_id
  app_service_subnet_id                  = var.network.app_service_subnet_id
  private_endpoint_subnet_id             = var.network.private_endpoint_subnet_id
  private_dns_zone_id                    = var.network.private_dns_zone_ids.app_service
  key_vault_uri                          = module.key_vault.vault_uri
  storage_account_name                   = module.storage.name
  sql_server_fqdn                        = module.sql.server_fqdn
  database_name                          = module.sql.database_name
  application_insights_connection_string = module.observability.application_insights_connection_string
  log_analytics_workspace_id             = module.observability.log_analytics_workspace_id
  action_group_id                        = module.observability.action_group_id
  tags                                   = local.common_tags
}

module "vmss" {
  count  = var.deployment_model == "vmss" ? 1 : 0
  source = "./modules/vmss"

  name                                 = local.names.vmss
  resource_group_name                  = data.azurerm_resource_group.this.name
  location                             = data.azurerm_resource_group.this.location
  subnet_id                            = var.network.vmss_subnet_id
  sku                                  = var.vmss_sku
  admin_username                       = var.vmss_admin_username
  ssh_public_key                       = var.vmss_ssh_public_key
  workload_identity_id                 = module.identity.id
  application_gateway_backend_pool_ids = [module.application_gateway.backend_pool_id]
  log_analytics_workspace_id           = module.observability.log_analytics_workspace_id
  tags                                 = local.common_tags
}

module "application_gateway" {
  source = "./modules/application-gateway"

  name                       = local.names.app_gateway
  resource_group_name        = data.azurerm_resource_group.this.name
  location                   = data.azurerm_resource_group.this.location
  subnet_id                  = var.network.application_gateway_subnet_id
  private_frontend_ip        = var.application_gateway_private_ip
  public_ip_address_id       = var.network.application_gateway_public_ip_id
  certificate_secret_id      = var.application_gateway_certificate_secret_id
  backend_fqdns              = var.deployment_model == "app_service" ? [module.app_service[0].default_hostname] : []
  backend_protocol           = var.deployment_model == "app_service" ? "Https" : "Http"
  backend_port               = var.deployment_model == "app_service" ? 443 : 80
  log_analytics_workspace_id = module.observability.log_analytics_workspace_id
  tags                       = local.common_tags
}

resource "azurerm_role_assignment" "gateway_certificate" {
  scope                = var.application_gateway_certificate_key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.application_gateway.identity_principal_id
}

resource "azurerm_role_assignment" "workload_key_vault" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.identity.principal_id
}

resource "azurerm_role_assignment" "workload_storage_blob" {
  scope                = module.storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.identity.principal_id
}
