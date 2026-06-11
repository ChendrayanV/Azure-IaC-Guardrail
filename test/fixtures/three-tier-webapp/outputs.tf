output "resource_group_name" {
  description = "Resource group hosting the three-tier application."
  value       = module.resource_group.name
}

output "web_application_url" {
  description = "HTTPS endpoint for the public web tier."
  value       = "https://${module.web_tier.default_hostname}"
}

output "app_tier_hostname" {
  description = "Default hostname of the private application tier."
  value       = module.app_tier.default_hostname
}

output "database_fqdn" {
  description = "Private PostgreSQL server FQDN."
  value       = module.data_tier.fqdn
}

output "log_analytics_workspace_id" {
  description = "Resource ID of the central Log Analytics workspace."
  value       = module.monitoring.log_analytics_workspace_id
}
