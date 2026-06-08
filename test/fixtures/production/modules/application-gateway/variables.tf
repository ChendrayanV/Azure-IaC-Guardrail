variable "name" { type = string }
variable "resource_group_name" { type = string }
variable "location" { type = string }
variable "subnet_id" { type = string }
variable "private_frontend_ip" { type = string }
variable "public_ip_address_id" {
  type     = string
  default  = null
  nullable = true
}
variable "certificate_secret_id" {
  type      = string
  sensitive = true
}
variable "backend_fqdns" { type = list(string) }
variable "backend_protocol" { type = string }
variable "backend_port" { type = number }
variable "log_analytics_workspace_id" { type = string }
variable "tags" { type = map(string) }
