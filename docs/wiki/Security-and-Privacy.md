# Security and Privacy

## Reporting

Use
[GitHub Security Advisories](https://github.com/ChendrayanV/Azure-IaC-Guardrail/security/advisories/new)
for vulnerabilities. Never include sensitive data in a public issue.

## Sensitive data

Potentially sensitive artifacts include:

- Terraform state and plan files.
- tfvars and backend configuration.
- Provider credentials and environment variables.
- Resource IDs, tenant IDs, subscription IDs, and principal IDs.
- Logs containing resolved values.

## Product requirements

- Generated plans are temporary by default.
- Exports include only evidence required for review.
- Errors and logs must not disclose secrets.
- Cloud Canvas is diagram-only and does not write generated Terraform.
- Telemetry, if implemented, must not collect Terraform content or Azure
  identifiers and must complete privacy review first.

## Dependency and release security

- Pin CI actions and minimize workflow permissions.
- Review bundled dependencies and update vulnerable packages.
- Produce checksums for release artifacts.
- Critical vulnerabilities block release.

