# Contributing

Thank you for improving Azure IaC Guardrail. Contributions should be focused,
reviewable, tested, and free of sensitive Azure or Terraform data.

## Workflow

1. Start from a GitHub issue with a clear outcome and acceptance criteria.
2. Create a focused branch from `main`.
3. Follow the existing TypeScript, webview, catalog, and test patterns.
4. Add or update tests and user documentation with the behavior.
5. Run the required checks and open a pull request linked to the issue.

## Contribute a Service or Standard Control

`catalog/services/` is the source of truth for built-in service definitions and
controls. One JSON file owns one service:

```text
catalog/services/<service-id>.json
```

Use `catalog/service-template.json.example` for a new service. Keep the
filename and `serviceId` identical and in lowercase snake_case.

For each control, provide:

- A unique, stable ID such as `AZ-STOR-001`.
- A concise title and a security-focused description.
- The exact `azurerm_*` resource types and Terraform attribute path.
- A supported operator and expected value.
- A severity that reflects the consequence of failure.
- Actionable remediation that does not contain environment-specific IDs.
- An authoritative Microsoft or recognized benchmark URL.
- `planOnly`, `skipStatic`, conditions, or related-resource metadata only when
  the scanner behavior requires them.

Controls must be enforceable from the data Guardrail can observe. Platform
guarantees that users cannot configure belong in `assurances`, not executable
controls. Do not mark a control compliant when a value is unresolved.

## Test a Control

Cover the states that apply:

- Compliant configuration.
- Non-compliant configuration.
- Missing or unresolved value.
- Static scan requiring a plan.
- Related-resource match and mismatch.
- Conditions that enable or suppress the control.

Prefer focused unit tests under `test/unit/` and representative Terraform
under `test/fixtures/`. Never add real credentials, state, plans, tfvars,
subscription IDs, tenant IDs, principal IDs, or sensitive resource names.

Run:

```powershell
npm run catalog:validate
npm run catalog:test
npm run check:terraform-identifiers
npm run check
npm run lint
npm test
npm run compile
```

Commit the edited `catalog/services/<service-id>.json` and regenerated
`azure-complete-catalog-vscode.json`. Never edit the generated catalog
directly.

## Definition of Done

A change is complete when behavior, failure paths, tests, documentation,
security impact, compatibility, and packaging impact have been addressed.
Preview features must state their limitations.

The detailed field reference and review checklist are in
[docs/wiki/Contributing.md](docs/wiki/Contributing.md).
