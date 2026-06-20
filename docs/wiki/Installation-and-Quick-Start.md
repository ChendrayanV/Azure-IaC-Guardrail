# Installation and Quick Start

## Install a Release

Download the approved `azure-iac-guardrail-<version>.vsix`. In VS Code, open
**Extensions**, select **Views and More Actions (...)**, choose **Install from
VSIX...**, and reload when prompted.

From a terminal:

```powershell
code --install-extension .\azure-iac-guardrail-<version>.vsix
```

Azure IaC Guardrail requires VS Code `1.100.0` or later. Terraform is required
only for module initialization and plan workflows.

## First Scan

1. Open the Terraform root module in VS Code.
2. Run **Azure IaC Guardrail: Azure Pre-configuration**.
3. Review **Remote catalog URL**. The default is the raw complete catalog in
   this repository:

   ```json
   {
     "catalogUrl": "https://raw.githubusercontent.com/ChendrayanV/Azure-IaC-Guardrail/main/azure-complete-catalog-vscode.json"
   }
   ```

4. Replace it with an organization-approved raw HTTPS catalog endpoint when
   required. Managed rollouts can also enforce
   `azureIacGuardrail.catalogUrl` and `azureIacGuardrail.catalogVersion` in VS
   Code settings.
5. Confirm the Terraform root and workspace policy.
6. Run **Azure IaC Guardrail: Scan Terraform Files**.
7. Open the Problems panel or Guardrail Results to review findings.

Use **Create and Scan Local Terraform Plan** when static analysis reports
**Plan required** or when exact module instances and relationships matter.

## Upgrade or Remove

Install a newer approved VSIX over the existing extension to upgrade. To
remove it, locate **Azure IaC Guardrail** in Extensions and select
**Uninstall**.

Workspace policy under `.azure-iac-guardrail/` is not removed automatically.
Review it before deleting because teams may commit the profile intentionally.

## Troubleshooting

- Confirm the correct Terraform root in Azure Pre-configuration.
- Confirm `azureIacGuardrail.catalogUrl` points to the approved HTTPS catalog.
- Configure `azureIacGuardrail.terraformPath` when Terraform is not on `PATH`.
- Initialize remote modules with **Initialize Modules and Scan Terraform
  Files**.
- Use the intended tfvars file for environment-specific results.
- Do not share plans, tfvars, state, or logs containing resolved values.
