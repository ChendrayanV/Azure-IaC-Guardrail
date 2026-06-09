# Product Vision

## Vision

Make secure Azure Terraform review an ordinary part of engineering work,
inside the editor, before infrastructure reaches a deployment pipeline.

## Target users

| Persona | Primary need |
|---|---|
| Application engineer | Fast, understandable Terraform feedback |
| Platform engineer | Shared standards and reusable policy |
| Security engineer | Enforceable controls and traceable exceptions |
| Cloud architect | Architecture and change-impact visibility |
| Auditor or risk reviewer | Durable, machine-readable evidence |

## Jobs to be done

1. When authoring Terraform, show actionable risks without requiring a full
   deployment workflow.
2. When reviewing a plan, explain what changes, what is exposed, and what is
   affected.
3. When governing teams, make policy, exceptions, and evidence consistent.
4. When exploring architecture, turn a visual model into reviewable Terraform.

## Product principles

- **Local first:** static analysis does not require Azure authentication.
- **No apply:** the extension never runs `terraform apply`.
- **Evidence over assertion:** explain observed, expected, source, and limits.
- **Secure by default:** generated scaffolding starts with conservative values.
- **Honest previews:** incomplete cost or generation coverage is labeled.
- **Human approval:** file writes and generated Terraform remain explicit.

## Success measures

- Scan completion and actionable-finding rate.
- Reduction in repeated high-severity Terraform defects.
- Percentage of plan findings resolved before pull-request approval.
- Evidence-pack adoption by assurance workflows.
- Preview-to-repeat-use conversion for cost and canvas features.
- Release quality: escaped defects, rollback events, and support response.

