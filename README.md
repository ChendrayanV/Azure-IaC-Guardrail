# Azure IaC Guardrail

![Azure IaC Guardrail logo](media/azure-iac-guardrail.svg)

A VS Code extension scaffold for scanning Terraform `.tf` files against
versioned Azure infrastructure controls and presenting violations in a native
IDE results panel.

For installation, scan workflows, settings, result interpretation, custom
controls, and troubleshooting, see the [User Guide](USER_GUIDE.md).

## Repository layout

```text
.
|-- src/
|   |-- core/                 # VS Code-independent parser and scanner
|   |-- controls/             # Catalog loading
|   |-- ui/                   # IDE results panel
|   `-- extension.ts          # VS Code activation and scan workflow
|-- azure-infrastructure-standards/
|   |-- schema/               # Control contract
|   |-- controls/             # Domain-based catalogs bundled in the VSIX
|   |-- tests/                # Standards validation guidance
|   |-- CHANGELOG.md
|   `-- VERSION
|-- .azure-iac-guardrail/
|   `-- controls/             # Workspace-specific control overlays
|-- test/
|   |-- unit/                 # Fast scanner tests
|   `-- fixtures/             # Terraform test workspaces
|-- .vscode/                  # F5 launch and build tasks
`-- dist/                     # Generated extension bundle
```

## Develop and test locally

```powershell
npm install
npm run check
npm test
npm run compile
```

Press `F5` in VS Code to launch an Extension Development Host. Open a
Terraform file and run **Azure IaC Guardrail: Scan Terraform Files**. A dedicated
**Azure IaC Guardrail Results** tab opens beside the editor with summary metrics,
finding cards, and remediation guidance. Select a file location in a finding
to jump directly to the affected Terraform line. Saving a Terraform file
refreshes an already-open results tab without stealing focus.

## Static and plan scans

The extension supports two complementary scan modes:

- **Scan Terraform Files** checks literal top-level values in `.tf` resource
  blocks. It is fast, offline, and useful while authoring.
- **Scan Existing Terraform Plan** accepts a binary `.tfplan` or JSON produced
  by `terraform show -json`. It checks resolved values, including variables,
  locals, modules, conditionals, and `for_each` instances.
- **Create and Scan Local Terraform Plan** runs `terraform plan` in the selected
  workspace and then scans its resolved JSON. Choose automatic variable loading
  (`terraform.tfvars` and `*.auto.tfvars`) or select a specific `.tfvars` file.

Press `Ctrl+Shift+P` and run:

```text
Azure IaC Guardrail: Create and Scan Local Terraform Plan
```

The extension runs `terraform init -input=false` before creating the plan, so
users do not normally need to initialize the workspace manually. Initialization
can download providers, configure the backend, create `.terraform`, and update
`.terraform.lock.hcl`. Set `azureIacGuardrail.initializeBeforePlan` to `false`
when initialization is managed by another workflow.

The generated binary plan is temporary and removed after conversion to JSON.
Terraform may still contact configured providers and read remote state while
creating the plan. The extension uses `-input=false` and `-lock=false`, and it
never applies infrastructure changes.

To scan a plan generated outside the extension:

```powershell
terraform plan -var-file="dev.tfvars" -out="dev.tfplan"
terraform show -json "dev.tfplan" > "dev.tfplan.json"
```

Use **Scan Existing Terraform Plan** with either `dev.tfplan` or
`dev.tfplan.json`. Configure a non-default executable with
`azureIacGuardrail.terraformPath`.

### Runtime variable-file example

The storage fixture uses:

```hcl
allow_nested_items_to_be_public = var.allow_public_access
```

Two runtime files are included:

- `test/fixtures/noncompliant/noncompliant.tfvars` sets the value to `true`.
- `test/fixtures/noncompliant/compliant.tfvars` sets the value to `false`.

Run **Azure IaC Guardrail: Scan Terraform Files** first. The control is displayed as **Plan
required** because a static scan cannot safely resolve the variable. Then run
**Azure IaC Guardrail: Create and Scan Local Terraform Plan**, select **Select a .tfvars file**, and
choose one of the files above. The noncompliant file produces `Observed: true`;
the compliant file produces a passing plan result.

## Package and distribute

Set a real `publisher` in `package.json`, then create a VSIX:

```powershell
npm run package
code --install-extension .\azure-iac-guardrail-0.1.0.vsix
```

For internal distribution, publish the VSIX as a CI artifact or release asset.
For managed enterprise rollout, publish to a private extension gallery or the
Visual Studio Marketplace and pin approved versions.

## Standards source of truth

The `azure-infrastructure-standards/` directory is the versioned source of
truth for bundled controls:

- `schema/control.schema.json` defines the catalog contract.
- `controls/*.json` groups controls by Azure service domain.
- `VERSION` identifies the immutable standards release.
- `CHANGELOG.md` records control additions and behavioral changes.
- `tests/` documents standards-specific validation.

The extension bundles this reviewed snapshot so scanning works offline.
Workspace overlays in `.azure-iac-guardrail/controls/*.json` remain appropriate
for project-specific rules, experiments, and staged adoption.

Storage private endpoint controls are evaluated from resolved Terraform plan
data because they must match each `azurerm_private_endpoint` to the target
storage account and its `blob`, `file`, `table`, or `queue` subresource. Static
file scans report these controls as requiring a plan.

The storage CMK recommendation applies when a resolved storage account has both
`environment = "production"` and `data_classification = "sensitive"` in its
`tags` map. Azure Storage encryption at rest is recorded as a platform
assurance rather than an executable control because Azure enables it for every
storage account and does not allow it to be disabled.

Legacy `azureCodeGuard.*` and `infraCompliance.*` settings, plus their matching
workspace control folders, remain supported for upgrades from earlier builds.

## Current scanner scope

The initial parser handles Terraform `resource` blocks and simple top-level
attributes. It deliberately keeps scanning independent of VS Code so a CLI or
CI runner can reuse it later. Before production use, replace the lightweight
parser with a full HCL syntax parser to handle expressions, dynamic blocks,
modules, and evaluated values reliably.
