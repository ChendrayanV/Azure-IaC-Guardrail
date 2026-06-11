variable "name" {
  description = "Virtual network name."
  type        = string
}

variable "resource_group_name" {
  description = "Resource group containing the network."
  type        = string
}

variable "location" {
  description = "Azure region for network resources."
  type        = string
}

variable "address_space" {
  description = "Virtual network address spaces."
  type        = list(string)
}

variable "tags" {
  description = "Tags applied to network resources."
  type        = map(string)
}
