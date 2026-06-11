module "network" {
  source  = "Azure/vnet/azurerm"
  version = "5.0.1"

  resource_group_name = var.resource_group_name
  vnet_location       = var.location
  vnet_name           = var.virtual_network_name
  address_space       = ["10.60.0.0/16"]
  subnet_names        = ["application"]
  subnet_prefixes     = ["10.60.1.0/24"]
  use_for_each        = true

  tags = local.tags
}
