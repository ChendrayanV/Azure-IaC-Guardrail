# Plan Scanning and Review

## Scan a Plan

Use **Create and Scan Local Terraform Plan** to initialize, create, convert,
and scan a temporary plan in the configured Terraform root. Select automatic
variable loading or a specific tfvars file.

Use **Scan Existing Terraform Plan** for a trusted binary `.tfplan` or
`terraform show -json` file created elsewhere.

Guardrail never runs `terraform apply`. Terraform may still contact providers,
read remote state, or request credentials while creating a plan.

## Review Results

A resolved plan adds:

- Exact resource instances and resolved values.
- Cross-resource relationships.
- Plan-only controls.
- Creates, updates, deletes, and replacements.
- Public exposure and architecture risk.
- Connected change and failed-control blast radius.

## Architecture

Run **Open Terraform Plan Architecture** to inspect a searchable,
dependency-aware canvas. Filter by action or risk, select a resource to
highlight connections, and export structural metadata as SVG. Resolved
attribute values and secrets are excluded from the diagram.

## Compare Plans

Run **Compare Two Terraform Plans** and select a baseline followed by a
candidate. The Markdown summary lists added, removed, changed, and unchanged
resources. Changed attribute names are included; sensitive values are omitted.

Generated plans are deleted by default. Enabling
`azureIacGuardrail.retainGeneratedPlan` stores the latest binary plan under
`.azure-iac-guardrail/plans/`; protect it as sensitive data.
