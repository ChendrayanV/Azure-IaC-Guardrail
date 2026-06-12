subscription_id     = "<SUBSCRIPTION-ID>"
tenant_id           = "<TENANT-ID>"
location            = "uksouth"
resource_group_name = "rg-storage-spa-dev"

# Change this to a globally unique name before planning or applying.
storage_account_name = "ststoragespa001"

tags = {
  environment = "development"
  workload    = "storage-spa"
  managed-by  = "terraform"
}
