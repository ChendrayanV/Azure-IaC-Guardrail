subscription_id     = "5d0dd3e3-3afe-4098-9766-c88bbd37dd3a"
tenant_id           = "1d65e300-b646-47ad-aef0-b428a3205ed6"
location            = "uksouth"
resource_group_name = "rg-storage-spa-dev"

# Change this to a globally unique name before planning or applying.
storage_account_name = "ststoragespa001"

tags = {
  environment = "development"
  workload    = "storage-spa"
  managed-by  = "terraform"
}
