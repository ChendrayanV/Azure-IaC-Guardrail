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

Provide:

- Azure service and Terraform resource types.
- Exact policy condition and severity.
- Microsoft or benchmark reference.
- Compliant, non-compliant, unresolved, and related-resource scenarios.
- Remediation wording that is safe and specific.

## Preview features

Preview features must display their status and limitations in the user
interface. Moving a feature to GA requires explicit exit criteria and coverage.

