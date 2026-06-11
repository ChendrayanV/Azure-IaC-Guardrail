locals {
  workload_name = "${var.name_prefix}-${var.environment}"

  common_tags = merge(var.tags, {
    environment = var.environment
    workload    = "three-tier-webapp"
    managed-by  = "terraform"
  })
}
