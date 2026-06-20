# Secure Key Vault

This fixture deploys an Azure Key Vault module-style configuration with private data-plane access and secure operational defaults.

The Key Vault disables public network access, uses Azure RBAC authorization, enables purge protection, denies unmatched network traffic, allows trusted Azure service bypass, publishes a private endpoint, links private DNS, and sends audit logs and metrics to Log Analytics. A sample secret is included to exercise secret authoring without committing real values.

## Resources

- Resource group
- Virtual network and private endpoint subnet
- Network security group for the private endpoint subnet
- Private DNS zone for Azure Key Vault
- Log Analytics workspace
- Key Vault with RBAC authorization, purge protection, and network ACLs
- Private endpoint with `vault` subresource
- Key Vault Secrets Officer role assignment for a supplied test principal
- Sample Key Vault secret
- Diagnostic setting for Key Vault audit logs and metrics

## Usage

Create a local tfvars file from the example and replace the placeholder values:

```powershell
Copy-Item development.tfvars.example development.tfvars
terraform init
terraform plan -var-file="development.tfvars"
```

Keep real subscription IDs, tenant IDs, object IDs, and secret values out of source control. Provide `sample_secret_value` through a secure local file, environment variable, or CI secret store.
