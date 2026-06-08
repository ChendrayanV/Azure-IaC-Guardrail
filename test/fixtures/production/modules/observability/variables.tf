variable "resource_group_name" { type = string }
variable "subscription_id" { type = string }
variable "location" { type = string }
variable "log_analytics_name" { type = string }
variable "application_insights_name" { type = string }
variable "action_group_name" { type = string }
variable "azure_monitor_private_link_scope_id" { type = string }
variable "retention_days" { type = number }
variable "alert_email_receivers" {
  type = map(object({
    name  = string
    email = string
  }))
}
variable "tags" { type = map(string) }
