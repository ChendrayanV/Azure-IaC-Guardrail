# Contributing

## Workflow

1. Start from a prioritized GitHub issue with acceptance criteria.
2. Create a focused branch from `main`.
3. Follow existing TypeScript, webview, Terraform-control, and test patterns.
4. Run all checks in the pull-request template.
5. Open a pull request and link the issue.

## Service and control contributions

Create or edit one file in `catalog/services`. That file owns the service's
Canvas metadata, Terraform parameters, controls, remediation, and icon path.
Start from `catalog/service-template.json.example`.

Run `npm run catalog:validate` and `npm run catalog:test`. Commit the rebuilt
`azure-complete-catalog-vscode.json`, but never edit it directly.

## Definition of done

A change is complete when behavior, tests, documentation, security review, and packaging impact are addressed. Preview features must state their limitations. Never commit Terraform state, plans, tfvars, credentials, subscription IDs, or tenant IDs.

See the [project wiki](https://github.com/ChendrayanV/Azure-IaC-Guardrail/wiki) for architecture and delivery guidance.
