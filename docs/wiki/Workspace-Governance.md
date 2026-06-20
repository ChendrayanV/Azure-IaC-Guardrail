# Workspace Governance

Run **Azure IaC Guardrail: Azure Pre-configuration** to create or update:

```text
.azure-iac-guardrail/profile.json
```

The profile can define:

- Terraform root within the VS Code workspace.
- Terraform version constraint for workspace governance metadata.
- Approved Azure regions.
- Monthly usage assumptions for cost estimates.
- Required tags and exact tag values.
- Time-bound exceptions with owner, justification, expiry, and ticket.
- Explicitly skipped control IDs.

Commit the profile when it represents shared team policy. Do not place secrets
or environment credentials in it.

Use governed exceptions for approved, temporary deviations. Use skipped
controls only when the organization has intentionally removed a check from the
workspace. Expired exceptions should fail review rather than remain silently
effective.

Workspace-specific control overlays may be placed under
`.azure-iac-guardrail/controls/`. Built-in standards should be contributed to
`catalog/services/draft/` first, then promoted to
`catalog/services/production/` when reviewed controls are ready to ship.
The baseline standards catalog is loaded from the HTTPS endpoint configured in
`azureIacGuardrail.catalogUrl`.
