# Azure IaC Guardrail User Guide

Azure IaC Guardrail is a Visual Studio Code extension that evaluates Terraform
resources against versioned Azure infrastructure controls. It supports quick
static checks while authoring and resolved Terraform plan checks before
deployment.

## 1. Requirements

- Visual Studio Code `1.100.0` or later.
- A workspace containing Terraform `.tf` files.
- Terraform installed and available on `PATH` for plan-based scans.
- Provider and backend credentials required by the selected Terraform
  workspace.

The extension does not apply, modify, or destroy Azure infrastructure.

## 2. Install the extension

Install a supplied VSIX from a terminal:

```powershell
code --install-extension .\azure-iac-guardrail-0.1.0.vsix
```

Alternatively, in VS Code:

1. Open the **Extensions** view.
2. Select **Views and More Actions**.
3. Select **Install from VSIX**.
4. Select the Azure IaC Guardrail VSIX.

Reload VS Code when prompted.

## 3. Run a static Terraform scan

Use this mode for fast feedback while editing.

1. Open the Terraform root folder in VS Code.
2. Open the Command Palette with `Ctrl+Shift+P`.
3. Run **Azure IaC Guardrail: Scan Terraform Files**.
4. Review the **Azure IaC Guardrail Results** tab.

The static scanner reads Terraform resource blocks and literal top-level
attributes. Values derived from variables, locals, modules, conditions, or
resource references may appear as **Plan required**.

Static scans are offline and do not invoke Terraform.

## 4. Create and scan a resolved plan

Use this mode to evaluate variables and relationships between resources, such
as storage accounts and private endpoints.

1. Open the Terraform root folder.
2. Open the Command Palette.
3. Run **Azure IaC Guardrail: Create and Scan Local Terraform Plan**.
4. Choose one of the variable options:
   - **Use automatic variable loading** uses `terraform.tfvars` and
     `*.auto.tfvars`.
   - **Select a .tfvars file** passes the selected file to Terraform with
     `-var-file`.
5. Wait for initialization, planning, and scanning to complete.

By default, the extension runs:

```text
terraform init -input=false -no-color
terraform plan -input=false -lock=false -no-color -out=<temporary-plan>
terraform show -json <temporary-plan>
```

The binary plan is stored temporarily in VS Code extension storage and deleted
after conversion to JSON. Plan JSON is processed in memory and is not retained
by the extension.

Terraform can contact providers, read remote state, download plugins, create
`.terraform`, and update `.terraform.lock.hcl`. It never runs `terraform apply`.

## 5. Scan an existing plan

Use this mode when a plan is created by another workflow or must be retained for
review.

Create a binary plan:

```powershell
terraform plan -var-file="production.tfvars" -out="production.tfplan"
```

Optionally convert it to JSON:

```powershell
terraform show -json "production.tfplan" > "production.tfplan.json"
```

Then:

1. Run **Azure IaC Guardrail: Scan Existing Terraform Plan**.
2. Select the `.tfplan` or plan JSON file.
3. Review the results.

Treat plan files as sensitive. They can contain resource attributes, identifiers,
configuration values, and values derived from secrets.

## 6. Understand the results

The results header reports the overall status:

- **Compliant**: all evaluated controls passed.
- **Action required**: one or more controls are non-compliant.
- **Plan required**: no failure was found, but one or more checks need resolved
  Terraform plan data.

Each control result has one of these states:

- **Compliant**: the observed value satisfies the control.
- **Non-compliant**: the observed value violates the control. Follow the
  remediation shown on the result card.
- **Plan required**: the static scanner cannot safely determine the result.
  Run a plan-based scan.

Use **All**, **Non-compliant**, **Compliant**, and **Plan required** to filter
the result cards. For static findings, select the file and line link to open the
affected Terraform source.

## 7. Scan on save

Static scanning on save is enabled by default. It runs only for saved `.tf`
documents and refreshes an existing results tab without opening a new tab.

Disable it in workspace settings:

```json
{
  "azureIacGuardrail.scanOnSave": false
}
```

## 8. Extension settings

| Setting | Default | Purpose |
|---|---|---|
| `azureIacGuardrail.scanOnSave` | `true` | Runs a static scan when a `.tf` file is saved. |
| `azureIacGuardrail.workspaceControlsPath` | `.azure-iac-guardrail/controls` | Workspace-relative directory containing additional control catalogs. |
| `azureIacGuardrail.terraformPath` | `terraform` | Terraform executable name or absolute path. |
| `azureIacGuardrail.initializeBeforePlan` | `true` | Runs `terraform init` before creating a local plan. |

Example configuration:

```json
{
  "azureIacGuardrail.scanOnSave": true,
  "azureIacGuardrail.terraformPath": "C:\\Tools\\Terraform\\terraform.exe",
  "azureIacGuardrail.initializeBeforePlan": false
}
```

Disable initialization only when the workspace is initialized by another
trusted process.

## 9. Built-in standards

Bundled standards are stored by domain under:

```text
azure-infrastructure-standards/controls/
```

The current storage standards cover:

- Public blob access.
- Public network access.
- Blob, file, table, and queue private endpoints.
- HTTPS-only secure transfer.
- Minimum TLS 1.2.
- Shared Key authorization.
- Customer-managed keys for production-sensitive storage.

Private endpoint checks require a resolved plan because the extension must
match endpoint resource IDs and storage subresources.

The customer-managed-key recommendation applies when the storage account has:

```hcl
tags = {
  environment         = "production"
  data_classification = "sensitive"
}
```

Azure Storage encryption at rest is recorded as a platform assurance because
Azure enables it for all storage accounts and does not allow it to be disabled.

## 10. Add workspace-specific controls

Place JSON catalogs in:

```text
.azure-iac-guardrail/controls/
```

The extension loads these catalogs in addition to bundled standards. Start from
`.azure-iac-guardrail/controls/example.json` and validate the structure against:

```text
azure-infrastructure-standards/schema/control.schema.json
```

Control IDs must be unique. Supported operators are:

- `equals`
- `notEquals`
- `exists`
- `relatedResourceExists`

Use workspace controls for project-specific requirements. Changes to shared
organizational policy should be reviewed and versioned in the standards
catalog.

## 11. Troubleshooting

### Terraform executable was not found

Confirm `terraform version` works in a terminal, or set
`azureIacGuardrail.terraformPath` to the executable's absolute path.

### Terraform initialization or planning failed

Run `terraform init` and `terraform plan` in the workspace terminal to inspect
the full provider, backend, authentication, or configuration error. Resolve the
Terraform error before running the extension command again.

### A check says Plan required

The value is computed or the control depends on relationships between resources.
Run **Create and Scan Local Terraform Plan** or scan an existing plan.

### The wrong variable values were scanned

Use **Select a .tfvars file** and choose the intended environment file. Automatic
loading only includes Terraform's standard `terraform.tfvars` and
`*.auto.tfvars` files.

### No applicable controls are shown

The scan did not find a Terraform resource type covered by the loaded catalogs.
Confirm the correct workspace is open and that workspace control files are in
the configured controls directory.

### A custom catalog is rejected

Check that the file is valid JSON and contains both `catalogVersion` and a
`controls` array. Compare it with the bundled schema and example catalog.

## 12. Recommended workflow

1. Keep scan on save enabled for immediate static feedback.
2. Resolve all clear non-compliant findings during development.
3. Run a resolved plan scan with the intended environment variables.
4. Review every non-compliant and plan-required result.
5. Retain an externally generated plan only when required by the deployment or
   approval process.
6. Apply infrastructure only through the organization's approved delivery
   workflow.
