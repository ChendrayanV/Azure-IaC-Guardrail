resource "azurerm_resource_group" "this" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_storage_account" "spa" {
  name                = var.storage_account_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location

  account_tier                     = "Standard"
  account_replication_type         = "LRS"
  account_kind                     = "StorageV2"
  access_tier                      = "Hot"
  allow_nested_items_to_be_public  = false
  https_traffic_only_enabled       = true
  min_tls_version                  = "TLS1_2"
  public_network_access_enabled    = true
  shared_access_key_enabled        = true
  default_to_oauth_authentication  = false
  cross_tenant_replication_enabled = false

  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

resource "azurerm_storage_account_static_website" "spa" {
  storage_account_id = azurerm_storage_account.spa.id
  index_document     = "index.html"
  error_404_document = "404.html"
}

resource "azurerm_storage_blob" "index" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.spa.name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html; charset=utf-8"
  source_content         = local.index_html

  depends_on = [azurerm_storage_account_static_website.spa]
}

resource "azurerm_storage_blob" "not_found" {
  name                   = "404.html"
  storage_account_name   = azurerm_storage_account.spa.name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html; charset=utf-8"
  source_content         = local.index_html

  depends_on = [azurerm_storage_account_static_website.spa]
}
