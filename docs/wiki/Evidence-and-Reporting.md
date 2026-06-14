# Evidence and Reporting

The Guardrail Results view can export:

- `compliance-report.pdf` for human review.
- `evidence.json` for automation and audit tooling.
- `evidence.md` for repositories, pull requests, and review records.

Reports summarize control outcomes, severity, observed and expected values,
remediation, standards references, and relevant architecture or change
context.

Treat evidence as potentially sensitive. Review the destination before export,
restrict access, and do not publish resolved identifiers or configuration
outside the intended assurance boundary.

Evidence records what Guardrail observed at scan time. It does not prove that
the reviewed plan was later applied unchanged. Deployment pipelines should
bind evidence to the reviewed commit and plan artifact when that assurance is
required.
