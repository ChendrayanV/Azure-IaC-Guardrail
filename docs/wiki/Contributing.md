# Contributing

## Before coding

Use or create a GitHub issue. Confirm the problem, acceptance criteria,
milestone, priority, and affected area.

## Local checks

```text
npm run check
npm run lint
npm test
npm run check:terraform-identifiers
npm run compile
```

## Pull requests

- Keep changes focused.
- Link the issue and describe the outcome.
- Include tests for behavior and failure paths.
- Update the README, user guide, wiki, or control references as needed.
- Do not commit secrets, Terraform state, plans, tfvars, subscription IDs, or
  tenant IDs.

## Control contributions

Create or edit one file in `catalog/services`. Start from
`catalog/service-template.json.example`. Provide:

- Azure service and Terraform resource types.
- Canvas category, icon path, parameters, and governance status.
- Exact policy condition and severity.
- Microsoft or benchmark reference.
- Compliant, non-compliant, unresolved, and related-resource scenarios.
- Remediation wording that is safe and specific.

Run `npm run catalog:validate` and `npm run catalog:test`. Commit the generated
`azure-complete-catalog-vscode.json`, but do not edit it directly.

## Preview features

Preview features must display their status and limitations in the user
interface. Moving a feature to GA requires explicit exit criteria and coverage.

