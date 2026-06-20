locals {
  workload_slug     = replace(var.workload_name, "-", "")
  resource_basename = "${var.workload_name}-${var.environment}-${var.name_suffix}"
  key_vault_name    = substr("kv${local.workload_slug}${var.environment}${var.name_suffix}", 0, 24)

  common_tags = merge(
    {
      environment = var.environment
      workload    = var.workload_name
      managed-by  = "terraform"
    },
    var.tags,
  )
}
