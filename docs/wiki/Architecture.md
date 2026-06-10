# Architecture

## Runtime

Azure IaC Guardrail is a TypeScript VS Code extension bundled with esbuild.
The VS Code extension host owns commands, workspace access, Terraform process
execution, webview panels, and exports.

## Core components

| Component | Responsibility |
|---|---|
| Static resolution and scanner | Resource parsing, tfvars/default/local resolution, provenance, and control evaluation |
| Plan scanner and analysis | Resolved values, relationships, change actions, risk |
| Control catalog | Built-in and workspace controls |
| Workspace policy | Regions, tags, exceptions, exclusions, cost assumptions |
| Results webview | Findings, architecture, change impact, and cost preview |
| Sketch Your Infra | Visual model, connectivity, and Terraform scaffolding |
| Plan architecture canvas | Configuration-reference and resolved-ID topology, dependency-aware layout, connectivity highlighting, filtering, and SVG export |
| Evidence and PDF export | Human and machine-readable review artifacts |

## Data boundaries

- Static scans read Terraform source locally.
- Static scans may read workspace-selected tfvars files locally.
- Plan scans invoke the configured Terraform executable.
- Provider and backend authentication remain Terraform responsibilities.
- Plan files and tfvars can contain secrets and must not be committed.
- Retail cost preview calls the unauthenticated Microsoft Retail Prices API.
- The extension does not run `terraform apply`.

## Control outcome model

- **Compliant:** the resolved or literal value satisfies the control.
- **Non-compliant:** the scan has enough evidence to prove a failure.
- **Plan required:** static source cannot safely resolve the value.
- **Apply-time value:** a plan exists, but Azure/provider data remains unknown.

## Engineering rules

- Keep core evaluation independent of VS Code where practical.
- Treat webview messages as untrusted input and validate them.
- Do not invent values for unresolved Terraform or Azure pricing data.
- Keep the source resolver deliberately bounded. Provider evaluation, remote
  state, data sources, complex comprehensions, and module execution belong to
  Terraform plan scanning.
- Require explicit user action before writing generated files.
- Add tests proportional to security impact and shared behavior.

