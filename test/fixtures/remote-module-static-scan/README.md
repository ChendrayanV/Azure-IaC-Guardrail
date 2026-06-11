# Remote module static scan fixture

This fixture demonstrates static scanning of a registry module whose source is
available under Terraform's `.terraform/modules` cache.

The root module calls the pinned public registry module:

```hcl
module "network" {
  source  = "Azure/vnet/azurerm"
  version = "5.0.1"
}
```

The committed cache contains only:

- `.terraform/modules/modules.json`
- The downloaded module's root Terraform source files
- The downloaded module license

Provider binaries, state, plans, examples, Git metadata, and lock files are
excluded. The source snapshot is included only to keep tests and demonstrations
offline and deterministic.

## Scan the committed cache

1. Open this directory as the VS Code workspace.
2. Run **Azure IaC Guardrail: Scan Terraform Files**.
3. Open `.terraform/modules/network/main.tf`.
4. Review the `AZ-NET-001` finding on the downloaded subnet resources.

The scanner reads the module path from `.terraform/modules/modules.json`,
indexes the downloaded source, and propagates values from `dev.tfvars` through
the root module call.

## Prove the real download workflow

Delete only this fixture's `.terraform` directory, then run:

```text
Azure IaC Guardrail: Initialize Modules and Scan Terraform Files
```

The extension runs:

```powershell
terraform init -backend=false -input=false -no-color
```

Terraform downloads `Azure/vnet/azurerm` version `5.0.1`, recreates
`.terraform/modules/modules.json`, and Guardrail scans the downloaded source.
No Terraform plan or apply is performed.

The Azure VNet module is used as a stable scanner demonstration. Its upstream
repository is archived, so use the current Azure Verified Module for new
production architecture.

- Fixture module: https://registry.terraform.io/modules/Azure/vnet/azurerm/5.0.1
- Current Azure Verified VNet module:
  https://registry.terraform.io/modules/Azure/avm-res-network-virtualnetwork/azurerm/latest
