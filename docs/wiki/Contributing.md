# Contributing Controls and Standards

This guide covers built-in Azure service metadata, standard controls, platform
assurances, and Cloud Canvas parameters.

## Source of Truth

Each service is defined in one file:

```text
catalog/services/<service-id>.json
```

The file may contain:

- Service identity, category, description, governance status, and icon.
- Terraform resource and ARM resource mappings.
- Cloud Canvas inspector parameters.
- Executable controls.
- Platform assurances.

`azure-complete-catalog-vscode.json` is generated from these files and is used
at runtime. Never edit it directly.

## Add a Service

1. Copy `catalog/service-template.json.example`.
2. Save it as `catalog/services/<service-id>.json`.
3. Set `serviceId` to the same lowercase snake_case value as the filename.
4. Use the original icon path beneath
   `media/cloud-canvas/Azure_Public_Service_Icons/Icons`.
5. Add Terraform mappings only when Guardrail can generate or scan them
   accurately.
6. Set `governanceStatus` honestly: `approved`, `under-review`, or
   `not-approved`.

Diagram-only services may use `null` for `terraform.resourceType`, empty
mapping arrays, and no controls.

## Add a Standard Control

Add the control to the owning service's `controls` array:

```json
{
  "id": "AZ-EXAMPLE-001",
  "title": "Example resources must use the approved setting",
  "description": "Explains the security or governance outcome.",
  "severity": "error",
  "resourceTypes": ["azurerm_example"],
  "attribute": "approved_setting_enabled",
  "operator": "equals",
  "expected": true,
  "remediation": "Set approved_setting_enabled = true.",
  "reference": "https://learn.microsoft.com/azure/"
}
```

Use a stable ID. Existing IDs are public contracts and should not be reused for
a different rule.

Supported operators are:

| Operator | Use |
|---|---|
| `equals` | Value must equal `expected` |
| `notEquals` | Value must differ from `expected` |
| `exists` | Attribute must be present |
| `oneOf` | Value must be one of the expected values |
| `contains` | Collection or string must contain the expected value |
| `relatedResourceExists` | A matching related Terraform resource must exist |

Use `conditions` when a rule applies only to a known resource state. Use
`planOnly` or `skipStatic` when source analysis cannot evaluate the rule
reliably. Related-resource controls must define the related resource type and
matching attributes.

## Add an Assurance

Use `assurances` for an Azure platform guarantee that cannot be disabled or
configured by Terraform. An assurance explains inherited protection; it must
not produce a compliance pass for a user-controlled setting.

## Control Quality Rules

- Control only observable and enforceable configuration.
- Use exact `azurerm_*` resource types and Terraform attribute paths.
- Prefer Microsoft documentation; add a benchmark link when it improves
  traceability.
- Write remediation as a concrete action, without customer IDs or names.
- Use `error` for a material security failure, `warning` for important
  hardening, and `information` for advisory checks.
- Preserve unresolved values as unresolved. Never infer compliance.
- Avoid duplicate controls that test the same outcome under different IDs.

## Tests

Add scenarios for every state that applies:

- Compliant.
- Non-compliant.
- Missing or unresolved.
- Plan required.
- Related resource present and absent.
- Condition met and not met.

Use focused tests under `test/unit/` and sanitized examples under
`test/fixtures/`.

## Validate

```powershell
npm run catalog:validate
npm run catalog:test
npm run check:terraform-identifiers
npm run check
npm run lint
npm test
npm run compile
```

Commit the service file and regenerated
`azure-complete-catalog-vscode.json`. The pull request should explain the
control outcome, evidence source, scanner mode, test matrix, and compatibility
impact.

Never commit Terraform state, plans, tfvars, credentials, subscription IDs,
tenant IDs, principal IDs, or sensitive evidence.
