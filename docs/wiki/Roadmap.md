# Roadmap

The roadmap is outcome-based. Dates are planning targets, not contractual
commitments.

## v0.2 - Product Foundation

**Target:** July 31, 2026

Outcome: reliable core scanning, secure execution, contributor workflow, and a
repeatable release process.

- [CI quality gates and VSIX releases](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/2)
- [Marketplace and release governance](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/3)
- [Terraform execution security](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/4)
- [Storage private-endpoint test matrix](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/5)
- [Contributor workflow](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/6)

## v0.3 - Architecture Diagram Preview

**Target:** September 30, 2026

Outcome: mature generated architecture and plan-review experiences with safer
catalog-driven interpretation of Terraform configuration and plan files.

- [Resource Cost Preview v2](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/7)
- [Cloud Canvas v2](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/8)
- [Organization module and resource mapping contracts](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/9)
- [Interactive plan architecture diagram](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/10)
- Variable-aware static scan and editor diagnostics

### Delivered preview increment

- Variable defaults, automatic and selected tfvars, locals, primitive
  collections, interpolation, and simple boolean conditionals resolve offline.
- VS Code diagnostics, hover details, completions, and quick actions are active.
- The plan architecture diagram supports deterministic layout, dependencies,
  action/risk/exposure overlays, search, filtering, details, and SVG export.
- Cloud Canvas generates Azure architecture diagrams from Terraform
  configuration or local plan files.

Issues #8, #9, and #10 remain open where acceptance criteria still require
official icon licensing, 100-node performance evidence, organization module
mappings, layout override persistence, or background layout for very large
plans.

## v0.4 - Enterprise Governance

**Target:** December 15, 2026

Outcome: scalable policy, pipeline integration, durable evidence, and
privacy-reviewed product insight.

- [Versioned organization policy profiles](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/11)
- [SARIF and pull-request annotations](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/12)
- [Evidence-pack schema](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/13)
- [Privacy-first telemetry](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/14)

## v1.0 - General Availability

**Target:** March 31, 2027

Outcome: a supportable Marketplace release with explicit compatibility,
security, privacy, upgrade, and operational commitments.

- [GA exit criteria](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/15)
- [Overall roadmap epic](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/1)

## Prioritization

Work is ordered by:

1. Security and data-exposure risk.
2. Correctness of compliance or generated Terraform.
3. User impact and frequency.
4. Release dependency and risk reduction.
5. Effort, maintainability, and evidence required.

