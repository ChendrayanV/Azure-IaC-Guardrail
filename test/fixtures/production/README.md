# Production Azure Web Application Platform

This fixture is an enterprise application-team Terraform root. It deploys a
secure Azure web platform while treating all networking as externally managed
by a Platform Team.

## Ownership boundary

The solution does **not** create or modify:

- virtual networks;
- subnets;
- network security groups;
- route tables;
- NAT gateways;
- public IP addresses; or
- private DNS zones; or
- Azure Monitor Private Link Scopes.

Those resource IDs enter through the `network` object variable. They can be
supplied by environment `.tfvars`, a pipeline, or a wrapper that consumes the
Platform Team's remote state. See
`examples/network-remote-state.tf.example`.

## Application resources

The root deploys:

- WAF_v2 Application Gateway with TLS, OWASP 3.2, Bot Manager rules,
  autoscaling, health probes, and private or externally supplied public
  frontend;
- either a private Linux App Service or a Linux Virtual Machine Scale Set;
- Azure SQL Server and Database with Entra-only administration, Private Link,
  zone redundancy in production, PITR, and long-term retention;
- Key Vault using Azure RBAC, purge protection, Private Link, and diagnostics;
- Storage Account with OAuth-by-default, disabled shared keys, Private Link,
  versioning, soft delete, change feed, and lifecycle management;
- user-assigned managed identities and least-privilege Azure RBAC;
- Log Analytics, workspace-based Application Insights, diagnostic settings,
  private ingestion, Resource Health notification, autoscaling, and alert
  foundations.

No passwords, private keys, certificates, connection strings, or database
credentials are hardcoded. Terraform and pipelines authenticate through
Microsoft Entra workload identity, managed identity, Azure CLI, or another
approved AzureRM provider authentication method.

## Repository structure

```text
production/
|-- environments/
|   |-- development/
|   |-- test/
|   |-- staging/
|   `-- production/
|-- examples/
|-- modules/
|   |-- application-gateway/
|   |-- app-service/
|   |-- identity/
|   |-- key-vault/
|   |-- observability/
|   |-- sql/
|   |-- storage/
|   `-- vmss/
|-- main.tf
|-- variables.tf
|-- outputs.tf
|-- locals.tf
`-- versions.tf
```

## Versions

- Terraform `>= 1.15.0, < 2.0.0`
- AzureRM provider `~> 4.76`

The constraints permit stable patch updates while preventing unreviewed major
provider upgrades.

## Deploy an environment

Copy the selected environment examples outside source control:

```powershell
Copy-Item backend.azurerm.tf.example backend.tf
Copy-Item environments\production\backend.hcl.example backend.hcl
Copy-Item environments\production\terraform.tfvars.example production.tfvars
```

Replace placeholders with approved platform outputs, then run:

```powershell
terraform init -backend-config=backend.hcl
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=production.tfvars -out=production.tfplan
terraform show -json production.tfplan > production.tfplan.json
```

The fixture uses local state by default so extension development and validation
do not require a remote state container. Copy `backend.azurerm.tf.example` to
`backend.tf` only for deployment. The deployment backend uses Azure AD
authentication and a distinct state key for each environment. The state storage
account, container, RBAC, locks, backup, and network controls remain Platform
Team responsibilities.

## Runtime selection

Set:

```hcl
deployment_model = "app_service"
```

or:

```hcl
deployment_model    = "vmss"
vmss_ssh_public_key = "ssh-ed25519 AAAA..."
```

Application Gateway terminates external TLS. App Service uses HTTPS to the
private App Service endpoint. VMSS uses HTTP over the approved private subnet;
NSG and route policy are owned by the Platform Team.

## Certificate handling

`application_gateway_certificate_secret_id` is a versionless Key Vault
certificate secret ID. The certificate remains in an externally managed Key
Vault. Terraform grants the Application Gateway managed identity only **Key
Vault Secrets User** on the supplied
`application_gateway_certificate_key_vault_id`.

## Azure SQL identity bootstrap

Infrastructure creates an Entra-only SQL logical server and the workload
managed identity. A database administrator must then create the contained
database user and grant the minimum application roles, for example through an
approved migration pipeline:

```sql
CREATE USER [application-managed-identity-name] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [application-managed-identity-name];
ALTER ROLE db_datawriter ADD MEMBER [application-managed-identity-name];
```

Terraform intentionally does not store SQL passwords or execute SQL using a
privileged credential.

## Production considerations

- Confirm the selected region supports three Application Gateway/VMSS zones,
  GZRS storage, and zone-redundant SQL for the chosen SKU.
- Provide valid platform DNS zones linked to the shared VNet.
- Provide an Azure Monitor Private Link Scope with DNS and a private endpoint
  connected to the approved monitoring network.
- Configure Azure Monitor alert processing rules, notification receivers,
  Service Health alerts, budgets, Defender for Cloud, and backup vault policy
  at the platform or subscription layer.
- Replace the VMSS bootstrap sample with a versioned image from an Azure
  Compute Gallery and a hardened application deployment pipeline.
- Treat Terraform plans and state as sensitive data.
