variable "name" {
  description = "PostgreSQL Flexible Server name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the database."
  type        = string
}

variable "location" {
  description = "Azure region for database resources."
  type        = string
}

variable "delegated_subnet_id" {
  description = "Subnet delegated to PostgreSQL Flexible Server."
  type        = string
}

variable "private_dns_zone_id" {
  description = "Private DNS zone resource ID."
  type        = string
}

variable "administrator_login" {
  description = "Database administrator username."
  type        = string
}

variable "administrator_password" {
  description = "Database administrator password."
  type        = string
  sensitive   = true
}

variable "sku_name" {
  description = "PostgreSQL Flexible Server SKU."
  type        = string
}

variable "environment" {
  description = "Deployment environment."
  type        = string
}

variable "tags" {
  description = "Tags applied to database resources."
  type        = map(string)
}
