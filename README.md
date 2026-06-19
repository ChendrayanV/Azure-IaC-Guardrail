<p align="center">
  <img src="media/azure-iac-guardrail.png" alt="Azure IaC Guardrail" width="112">
</p>

<h1 align="center">Azure IaC Guardrail</h1>

<p align="center">
  <strong>Review Azure Terraform security, compliance, architecture, and change impact before deployment.</strong>
</p>

<p align="center">
  Local static analysis, resolved plan assurance, architecture review,
  governed exceptions, and audit evidence inside Visual Studio Code.
</p>

<p align="center">
  <img alt="Release status: Public Preview" src="https://img.shields.io/badge/release-Public_Preview-f59e0b">
  <a href="https://github.com/ChendrayanV/Azure-IaC-Guardrail/actions/workflows/ci.yml"><img alt="Extension CI" src="https://github.com/ChendrayanV/Azure-IaC-Guardrail/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/ChendrayanV/Azure-IaC-Guardrail/actions/workflows/release.yml"><img alt="Release" src="https://github.com/ChendrayanV/Azure-IaC-Guardrail/actions/workflows/release.yml/badge.svg"></a>
  <img alt="Unit tests: 123 passing" src="https://img.shields.io/badge/unit_tests-123_passing-16a34a">
  <img alt="Control coverage: 26 services and 143 controls" src="https://img.shields.io/badge/controls-26_services_%7C_143_controls-0078d4">
  <img alt="VS Code 1.100 or later" src="https://img.shields.io/badge/VS_Code-%5E1.100.0-007ACC?logo=visualstudiocode">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-2563eb"></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="USER_GUIDE.md">User guide</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

> Azure IaC Guardrail never runs `terraform apply`. Static scans are offline.
> Plan scans use your local Terraform executable and the authentication already
> configured for the selected workspace.

> **Public Preview:** Guardrail is suitable for evaluation and guarded
> engineering review, not as the sole deployment approval control. The Cloud
> Canvas catalog contains 237 visual entries; 26 currently have production
> controls, 48 have Terraform mappings, and only governance-approved services
> should be treated as supported generation targets.

## From Terraform to Evidence

![Azure IaC Guardrail review workflow](media/screenshots/workflow.png)

The workflow stays local and reviewable: open the Terraform root, choose the
appropriate scan, inspect findings and remediation, then export evidence for
the pull request or deployment approval.

## Why Guardrail

| Author | Review | Govern | Evidence |
|---|---|---|---|
| Detect risky Terraform while editing. | Inspect resolved plans, dependencies, exposure, and blast radius. | Apply shared controls, tags, regions, exclusions, and time-bound exceptions. | Export PDF, JSON, and Markdown artifacts for engineering and assurance workflows. |

## Install

### From a release VSIX

1. Download `azure-iac-guardrail-<version>.vsix` from the approved release.
2. In VS Code, open **Extensions** and select **Views and More Actions (...) > Install from VSIX...**.
3. Select the downloaded package and reload VS Code when prompted.

The same installation can be performed from a terminal:

```powershell
code --install-extension .\azure-iac-guardrail-<version>.vsix
```

For a managed rollout, distribute the approved VSIX through your software
management platform or private extension gallery. Marketplace installation
instructions will be added when the public publisher is configured.

**Requirements**

- Visual Studio Code `1.100.0` or later.
- Terraform only for plan-based workflows.
- Azure/provider authentication only when the selected Terraform workflow
  requires it.

See [Installation and Quick Start](docs/wiki/Installation-and-Quick-Start.md)
for upgrades, uninstalling, and troubleshooting.

## Quick Start

1. Open the folder containing your Terraform root module.
2. Press `Ctrl+Shift+P`.
3. Run **Azure IaC Guardrail: Azure Pre-configuration** and select the Terraform
   root, approved regions, required tags, and any governed exceptions.
4. Run **Azure IaC Guardrail: Scan Terraform Files** for immediate offline
   feedback.
5. Run **Azure IaC Guardrail: Create and Scan Local Terraform Plan** when you
   need resolved values, module instances, relationships, and change impact.
6. Review findings in **Azure IaC Guardrail Results**, apply only reviewed
   fixes, and export the required evidence.

For the complete operating guide, see [USER_GUIDE.md](USER_GUIDE.md).


Static feedback starts in the editor. A Terraform plan adds authoritative
resolved values and relationships. Reviewers then use the same findings,
architecture context, and exported evidence before approving deployment.

## Product View

![Azure IaC Guardrail results](media/screenshots/results-overview.png)

<sub>Illustrative product view. The extension evaluates Terraform; resource
names and findings shown here are representative sample data.</sub>

## Features

| Feature | Purpose | Guide |
|---|---|---|
| Static Terraform scan | Offline checks with supported variables, tfvars, locals, and modules | [Static Scanning](docs/wiki/Static-Scanning.md) |
| Plan scan | Evaluate resolved resources, relationships, and plan-only controls | [Plan Scanning and Review](docs/wiki/Plan-Scanning-and-Review.md) |
| Editor diagnostics | Problems, hover detail, completions, provenance, and reviewable quick fixes | [Editor Experience](docs/wiki/Editor-Experience.md) |
| Workspace governance | Configure roots, regions, tags, cost assumptions, exclusions, and exceptions | [Workspace Governance](docs/wiki/Workspace-Governance.md) |
| Plan architecture | Search and filter plan topology, risk, actions, and exposure; export SVG | [Plan Scanning and Review](docs/wiki/Plan-Scanning-and-Review.md) |
| Plan comparison and blast radius | Compare plans and summarize connected change impact | [Plan Scanning and Review](docs/wiki/Plan-Scanning-and-Review.md) |
| Resource Cost | Estimate supported retail costs from declared configuration and assumptions | [Resource Cost](docs/wiki/Resource-Cost.md) |
| Cloud Canvas | Design Azure architectures and generate reviewable Terraform | [Cloud Canvas](docs/wiki/Cloud-Canvas.md) |
| Evidence export | Produce a PDF report plus machine-readable JSON and Markdown | [Evidence and Reporting](docs/wiki/Evidence-and-Reporting.md) |

Resource Cost and Cloud Canvas are **Preview** features. Their output requires
human review and is not an Azure bill or deployment approval.

## Scan Modes

| Command | Use it when | Terraform needed |
|---|---|---:|
| **Scan Terraform Files** | You want fast, offline authoring feedback | No |
| **Initialize Modules and Scan Terraform Files** | remote module source has not been downloaded | Yes |
| **Scan Existing Terraform Plan** | CI/CD or another trusted workflow produced a plan | For binary plans |
| **Create and Scan Local Terraform Plan** | You need resolved values, instances, and relationships | Yes |

Generated local plans are temporary by default. Terraform state, plans,
tfvars, backend configuration, credentials, subscription IDs, and tenant IDs
must not be committed.

## Controls and Standards

Built-in service and control definitions live in:

```text
catalog/services/production/<service-id>.json
catalog/services/draft/<service-id>.json
```

Production controls live under `catalog/services/production/`. Draft service
metadata lives under `catalog/services/draft/` and remains available for Cloud
Canvas, but draft controls and assurances are not shipped until the service is
promoted. The generated `azure-complete-catalog-vscode.json` is consumed by
scanning and Cloud Canvas; do not edit it directly.

Built-in production scanning currently covers these Azure service families:

```text
AI Foundry, App Configuration, Application Gateway, Azure SQL,
Container Registry, Cosmos DB, Azure Database for MySQL,
Azure Database for PostgreSQL, Event Grid, Event Hubs, Azure Firewall,
Functions, Key Vault, Azure Kubernetes Service, Log Analytics,
Machine Learning, Network Security Group, Public IP, Resource Group,
Service Bus, SQL Server, Storage Account, Subnet, Virtual Machine,
Web App, and Web Application Firewall.
```

Draft services still appear in Cloud Canvas for architecture sketching, but
they do not add built-in scan findings until promoted to production coverage.

To add or change a standard control:

1. Copy `catalog/service-template.json.example` when adding a service, or open
   the existing service file under `catalog/services/draft/`.
2. Define a unique control ID, exact Terraform resource type and attribute,
   supported operator, expected value, severity, remediation, and authoritative
   reference.
3. Add tests for compliant, non-compliant, and unresolved behavior. Add plan
   and related-resource cases when the control requires them.
4. Run:

   ```powershell
   npm run catalog:validate
   npm run catalog:test
   npm run check
   npm run lint
   npm test
   npm run compile
   ```

5. Keep new services in `catalog/services/draft/` until controls are reviewed.
   Promote to `catalog/services/production/` when at least one executable
   control is ready to ship.
6. Commit the service file and regenerated
   `azure-complete-catalog-vscode.json`.

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Control and Standard Contribution Guide](docs/wiki/Contributing.md) before
opening a pull request.

## Develop

```powershell
npm install
npm run check
npm run lint
npm test
npm run compile
```

Press `F5` to launch an Extension Development Host. Maintained Terraform
examples are under `test/fixtures/`, including `storage-spa`,
`three-tier-webapp`, `remote-module-static-scan`, and
`intellisense-ux-demo`.

## Release

Pull requests and pushes to `main` run identifier checks, type checking,
linting, unit tests, compilation, and VSIX packaging. A semantic version tag
(`vX.Y.Z`) builds a checksummed release candidate and publishes it through the
protected Marketplace environment.

Release prerequisites and rollback guidance are documented in
[Release Management](docs/wiki/Release-Management.md) and
[docs/RELEASING.md](docs/RELEASING.md).

## Security and Support

- Report vulnerabilities privately through
  [GitHub Security Advisories](https://github.com/ChendrayanV/Azure-IaC-Guardrail/security/advisories/new).
- Use [GitHub Issues](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues)
  for defects and feature requests without sensitive data.
- Review [SECURITY.md](SECURITY.md) and
  [Security and Privacy](docs/wiki/Security-and-Privacy.md) before sharing logs
  or evidence.

## License

Released under the [MIT License](LICENSE).
