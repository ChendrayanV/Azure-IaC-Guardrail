# Terraform Local Static Scan Scenarios

Azure IaC Guardrail performs conservative local analysis before a Terraform
plan exists. This page describes each supported source and value scenario.

## Select the Terraform root first

Run **Azure IaC Guardrail: Azure Pre-configuration** and use the **Terraform
workspace root** card. Choose a folder, type a workspace-relative path, or
reset to `.`. Guardrail validates that the folder is inside the workspace and
contains `.tf` files before saving:

```json
{
  "version": 1,
  "terraformRoot": "infra/application"
}
```

Static scanning, module initialization, `.tfvars` selection, and local plan
generation all use this configured root.

## Quick decision table

| Scenario | Static scan behavior | User action |
|---|---|---|
| Resources in the root module | Scanned directly | Run **Scan Terraform Files** |
| Local module using `./` or `../` | Module source and resolvable inputs are scanned | No initialization required |
| Registry or Git module already in `.terraform/modules` | Downloaded source is scanned using Terraform's module manifest | Run the ordinary static scan |
| Registry or Git module not downloaded | Root call is reported as unresolved | Choose **Initialize modules and rescan** |
| Dynamic module `source` expression | Source cannot be located safely | Use a literal source or create a plan |
| Missing local module directory | Module call is reported as unresolved | Correct the source path |
| Module using `count` or `for_each` | Source is scanned once | Create a plan for exact instances |
| Root variable default | Used when no selected value overrides it | No action |
| `terraform.tfvars` or `*.auto.tfvars` | Loaded automatically | Edit the marked assignment |
| Selected environment `.tfvars` | Loaded in configured order | Use **Select Static Scan Variable Files** |
| Variable passed into a child module | Resolvable input is propagated | Findings link to the originating value |
| Locals, lists, maps, interpolation, simple conditionals | Evaluated when all inputs are known | Fix the marked source value |
| Nested blocks such as `site_config` | Visible scalar attributes are evaluated | Use block-specific IntelliSense or Quick Fix |
| Related resources in different files/modules | Evaluated across the complete static workspace | No action |
| Data sources, remote state, provider functions | Not executed during static scanning | Create a resolved plan |
| Module outputs and provider-computed values | Remain unknown | Create a resolved plan |
| Dynamic blocks and complex comprehensions | Conservatively unresolved | Simplify or create a plan |

## Working downloaded-module example

Open:

```text
test/fixtures/remote-module-static-scan
```

The fixture calls the pinned registry module
`Azure/vnet/azurerm` version `5.0.1`. Its minimal downloaded source snapshot is
stored under:

```text
.terraform/modules/network
```

Terraform's module manifest maps `module.network` to that directory:

```text
.terraform/modules/modules.json
```

The pinned module is archived and is used only because its downloaded source
contains straightforward `azurerm_virtual_network` and `azurerm_subnet`
resources that make scanner behavior easy to inspect. New production designs
should use the current Azure Verified VNet module.

Run **Azure IaC Guardrail: Scan Terraform Files**. Guardrail:

1. Loads `dev.tfvars`.
2. Evaluates root variables and locals.
3. Parses the `module.network` call.
4. Reads the module directory from Terraform's manifest.
5. Propagates resolvable module inputs.
6. Scans `azurerm_virtual_network` and `azurerm_subnet` resources inside the
   downloaded source.
7. Reports `AZ-NET-001` because the downloaded subnet resources do not define
   `default_outbound_access_enabled = false`.

The suggested fix is shown in the downloaded source for demonstration. In a
real third-party module, do not edit `.terraform/modules` permanently. Upgrade
or wrap the module, contribute the fix upstream, or enforce the setting through
a supported module input.

## Download an uninitialized remote module

When `.terraform/modules` is absent, the static scan reports:

```text
Module source must be available for static scanning
```

Choose **Initialize modules and rescan**. Guardrail runs:

```powershell
terraform init -backend=false -input=false -no-color
```

This downloads registry and Git modules without configuring a remote backend,
creating a plan, or applying infrastructure. The subsequent scan indexes the
downloaded source.

## Variable and non-technical editing experience

When a non-compliant resource value comes from `.tfvars`, Guardrail places the
diagnostic on the exact assignment and links back to the resource. Supported
scalar controls provide a preferred **Change value to...** action.

IntelliSense suggestions are filtered by:

- Azure resource type.
- Current nested block.
- Applicable controls and safe expected values.

Multiple checks that genuinely require a plan are summarized into one
informational message rather than displayed as a long list.

## Static scan boundaries

Static scanning does not execute Terraform providers or read Azure. A resolved
Terraform plan remains authoritative for:

- Exact `count` and `for_each` instances.
- Module outputs.
- Data sources.
- Remote state.
- Provider functions and computed values.
- Apply-time IDs and relationships.
- Dynamic blocks and complex expressions not supported by the bounded
  evaluator.
