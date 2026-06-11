module "resource_group" {
  source = "./modules/resource-group"

  name     = "rg-${local.workload_name}"
  location = var.location
  tags     = local.common_tags
}

module "network" {
  source = "./modules/network"

  name                = "vnet-${local.workload_name}"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  address_space       = ["10.40.0.0/16"]
  tags                = local.common_tags
}

module "monitoring" {
  source = "./modules/monitoring"

  name                = local.workload_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.common_tags
}

module "data_tier" {
  source = "./modules/data-tier"

  name                   = "psql-${local.workload_name}"
  resource_group_name    = module.resource_group.name
  location               = module.resource_group.location
  delegated_subnet_id    = module.network.data_subnet_id
  private_dns_zone_id    = module.network.postgresql_private_dns_zone_id
  administrator_login    = var.database_admin_username
  administrator_password = var.database_admin_password
  sku_name               = var.database_sku_name
  environment            = var.environment
  tags                   = local.common_tags
}

module "app_tier" {
  source = "./modules/app-tier"

  name                                   = "app-${local.workload_name}"
  resource_group_name                    = module.resource_group.name
  location                               = module.resource_group.location
  subnet_id                              = module.network.app_subnet_id
  sku_name                               = var.app_sku_name
  database_host                          = module.data_tier.fqdn
  database_name                          = module.data_tier.database_name
  application_insights_connection_string = module.monitoring.application_insights_connection_string
  log_analytics_workspace_id             = module.monitoring.log_analytics_workspace_id
  tags                                   = local.common_tags
}

module "web_tier" {
  source = "./modules/web-tier"

  name                                   = "web-${local.workload_name}"
  resource_group_name                    = module.resource_group.name
  location                               = module.resource_group.location
  subnet_id                              = module.network.web_subnet_id
  sku_name                               = var.web_sku_name
  app_tier_url                           = module.app_tier.default_hostname
  application_insights_connection_string = module.monitoring.application_insights_connection_string
  log_analytics_workspace_id             = module.monitoring.log_analytics_workspace_id
  tags                                   = local.common_tags
}
