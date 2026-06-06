terraform {
  required_version = ">= 1.1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.76"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "allow_public_access" {
  description = "Controls whether nested blobs and containers can be made public."
  type        = bool
  default     = false
}

locals {
  resource_group_name          = "rg-azure-iac-guardrail-example"
  storage_account_name         = "stcomplianceexample"
  virtual_network_name         = "vnet-azure-iac-guardrail-example"
  private_endpoint_subnet_name = "snet-private-endpoints"

  tags = {
    environment = "test"
    managed_by  = "terraform"
    workload    = "azure-iac-guardrail"
  }
}

resource "azurerm_resource_group" "example" {
  name     = local.resource_group_name
  location = "uksouth"
  tags     = local.tags
}

resource "azurerm_virtual_network" "example" {
  name                = local.virtual_network_name
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  address_space       = ["10.20.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "private_endpoints" {
  name                 = local.private_endpoint_subnet_name
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.20.1.0/24"]
}

resource "azurerm_storage_account" "example" {
  name                = local.storage_account_name
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  access_tier              = "Hot"

  # Resolved at plan time from the selected .tfvars file.
  allow_nested_items_to_be_public = var.allow_public_access

  cross_tenant_replication_enabled  = false
  default_to_oauth_authentication   = true
  https_traffic_only_enabled        = true
  infrastructure_encryption_enabled = true
  local_user_enabled                = false
  min_tls_version                   = "TLS1_2"
  public_network_access_enabled     = true
  shared_access_key_enabled         = true
  table_encryption_key_type         = "Account"
  queue_encryption_key_type         = "Account"

  blob_properties {
    change_feed_enabled           = true
    change_feed_retention_in_days = 7
    last_access_time_enabled      = true
    versioning_enabled            = true

    container_delete_retention_policy {
      days = 7
    }

    delete_retention_policy {
      days                     = 7
      permanent_delete_enabled = false
    }

    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "OPTIONS"]
      allowed_origins    = ["https://example.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  share_properties {
    retention_policy {
      days = 7
    }

    smb {
      versions                        = ["SMB3.1.1"]
      authentication_types            = ["Kerberos"]
      kerberos_ticket_encryption_type = ["AES-256"]
      channel_encryption_type         = ["AES-256-GCM"]
      multichannel_enabled            = false
    }

    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "OPTIONS"]
      allowed_origins    = ["https://example.com"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }

  network_rules {
    default_action = "Allow"
    bypass         = ["AzureServices"]
  }

  sas_policy {
    expiration_action = "Log"
    expiration_period = "01.00:00:00"
  }

  routing {
    choice                      = "MicrosoftRouting"
    publish_internet_endpoints  = true
    publish_microsoft_endpoints = true
  }

  tags = local.tags
}

resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.example.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  name                  = "link-storage-blob"
  resource_group_name   = azurerm_resource_group.example.name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.example.id
  registration_enabled  = false
  tags                  = local.tags
}

resource "azurerm_private_endpoint" "blob" {
  name                = "pe-${local.storage_account_name}-blob"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  subnet_id           = azurerm_subnet.private_endpoints.id
  tags                = local.tags

  private_service_connection {
    name                           = "psc-${local.storage_account_name}-blob"
    private_connection_resource_id = azurerm_storage_account.example.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "blob"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }
}

resource "azurerm_private_dns_zone" "table" {
  name                = "privatelink.table.core.windows.net"
  resource_group_name = azurerm_resource_group.example.name
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "table" {
  name                  = "link-storage-table"
  resource_group_name   = azurerm_resource_group.example.name
  private_dns_zone_name = azurerm_private_dns_zone.table.name
  virtual_network_id    = azurerm_virtual_network.example.id
  registration_enabled  = false
  tags                  = local.tags
}

resource "azurerm_private_endpoint" "table" {
  name                = "pe-${local.storage_account_name}-table"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  subnet_id           = azurerm_subnet.private_endpoints.id
  tags                = local.tags

  private_service_connection {
    name                           = "psc-${local.storage_account_name}-table"
    private_connection_resource_id = azurerm_storage_account.example.id
    subresource_names              = ["table"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "table"
    private_dns_zone_ids = [azurerm_private_dns_zone.table.id]
  }
}

# Queue service properties
resource "azurerm_storage_account_queue_properties" "example" {
  storage_account_id = azurerm_storage_account.example.id

  cors_rule {
    allowed_headers    = ["*"]
    allowed_methods    = ["GET", "HEAD", "OPTIONS"]
    allowed_origins    = ["https://example.com"]
    exposed_headers    = ["*"]
    max_age_in_seconds = 3600
  }

  logging {
    delete                = true
    read                  = true
    version               = "1.0"
    write                 = true
    retention_policy_days = 7
  }

  hour_metrics {
    include_apis          = true
    retention_policy_days = 7
    version               = "1.0"
  }

  minute_metrics {
    include_apis          = true
    retention_policy_days = 7
    version               = "1.0"
  }
}

# Static website service
resource "azurerm_storage_account_static_website" "example" {
  storage_account_id = azurerm_storage_account.example.id
  index_document     = "index.html"
  error_404_document = "404.html"
}

# Blob service
resource "azurerm_storage_container" "application" {
  name                  = "application"
  storage_account_id    = azurerm_storage_account.example.id
  container_access_type = "private"

  metadata = {
    purpose = "application-content"
  }
}

resource "azurerm_storage_blob" "example" {
  name                   = "example.txt"
  storage_account_name   = azurerm_storage_account.example.name
  storage_container_name = azurerm_storage_container.application.name
  type                   = "Block"
  content_type           = "text/plain"
  source_content         = "Example blob managed by Terraform."
}

# Azure Files service
resource "azurerm_storage_share" "application" {
  name               = "application"
  storage_account_id = azurerm_storage_account.example.id
  quota              = 100
  access_tier        = "TransactionOptimized"
  enabled_protocol   = "SMB"

  metadata = {
    purpose = "application-files"
  }
}

resource "azurerm_storage_share_directory" "documents" {
  name             = "documents"
  storage_share_id = azurerm_storage_share.application.id
}

resource "azurerm_storage_share_file" "readme" {
  name             = "README.txt"
  storage_share_id = azurerm_storage_share.application.id
  path             = azurerm_storage_share_directory.documents.name
  source           = "${path.module}/assets/README.txt"
  content_type     = "text/plain"
}

# Queue service
resource "azurerm_storage_queue" "jobs" {
  name               = "jobs"
  storage_account_id = azurerm_storage_account.example.id

  metadata = {
    purpose = "background-jobs"
  }
}

# Table service
resource "azurerm_storage_table" "entities" {
  name                 = "entities"
  storage_account_name = azurerm_storage_account.example.name
}

# Static website content is stored in the special $web container.
resource "azurerm_storage_blob" "website_index" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.example.name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html"
  source_content         = <<-HTML
    <!doctype html>
    <html lang="en">
      <head><title>Azure IaC Guardrail</title></head>
      <body><h1>Azure Storage static website</h1></body>
    </html>
  HTML

  depends_on = [azurerm_storage_account_static_website.example]
}

resource "azurerm_storage_blob" "website_404" {
  name                   = "404.html"
  storage_account_name   = azurerm_storage_account.example.name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html"
  source_content         = "<h1>Page not found</h1>"

  depends_on = [azurerm_storage_account_static_website.example]
}
