# Editor Experience

After a scan, Azure IaC Guardrail publishes findings to the VS Code Problems
panel and opens the Guardrail Results view.

Editor features include:

- Diagnostics on the resource or originating tfvars assignment.
- Hover detail with observed and expected values, remediation, reference, and
  provenance.
- Resource-aware completion items from the active control catalog.
- Nested-block suggestions for supported Terraform structures.
- Quick actions to rescan, select variable files, initialize modules, or
  create a plan.
- Reviewable scalar corrections and **Preview Safe Fix** output.

Guardrail does not silently rewrite Terraform. Review every proposed change,
especially when a value is shared through variables or modules.

With `azureIacGuardrail.scanOnSave` enabled, saving Terraform refreshes an
already-open result set without taking editor focus.
