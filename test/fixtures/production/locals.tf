locals {
  compact_name        = replace(var.workload_name, "-", "")
  resource_group_name = var.resource_group_name

  common_tags = merge(var.tags, {
    environment  = var.environment
    deployed-via = "terraform"
    workload     = var.workload_name
  })

  names = {
    identity         = "id-${var.workload_name}-${var.environment}"
    key_vault        = substr("kv-${var.workload_name}-${var.unique_suffix}", 0, 24)
    storage          = substr("st${local.compact_name}${var.unique_suffix}", 0, 24)
    sql_server       = substr("sql-${var.workload_name}-${var.unique_suffix}", 0, 63)
    sql_database     = "sqldb-${var.workload_name}-${var.environment}"
    log_analytics    = "law-${var.workload_name}-${var.environment}"
    app_insights     = "appi-${var.workload_name}-${var.environment}"
    app_service_plan = "asp-${var.workload_name}-${var.environment}"
    web_app          = substr("app-${var.workload_name}-${var.unique_suffix}", 0, 60)
    vmss             = "vmss-${var.workload_name}-${var.environment}"
    app_gateway      = "agw-${var.workload_name}-${var.environment}"
    action_group     = "ag-${var.workload_name}-${var.environment}"
  }
}
