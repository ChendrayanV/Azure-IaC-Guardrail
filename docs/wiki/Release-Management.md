# Release Management

## Versioning

Use semantic versioning:

- **Patch:** compatible defect or documentation fix.
- **Minor:** backward-compatible capability or expanded control coverage.
- **Major:** incompatible configuration, schema, or workflow change.

Preview features do not receive GA compatibility guarantees until documented.

## Release gates

- Type check, lint, tests, identifier guard, and compile pass.
- No open critical security or correctness defect.
- User guide and release notes are current.
- Preview limitations and migrations are documented.
- VSIX installs and activates on supported VS Code versions.

## Release artifacts

- Marketplace extension or approved VSIX.
- Changelog and GitHub release notes.
- Artifact checksum.
- Compatibility and migration notes.
- Known limitations and rollback guidance.

## Catalog releases

The extension runtime and guardrail catalog are released independently.

- Extension version: the VS Code runtime, commands, panels, scanners, and
  packaging metadata in `package.json`.
- Catalog version: the generated service/control payload built from
  `catalog/services/{production,draft}/*.json` and stamped from
  `catalog/VERSION`.

The repository remains the source of truth for both. Catalog authors update the
service JSON files, bump `catalog/VERSION` when publishing a governed catalog
drop, and regenerate `azure-complete-catalog-vscode.json`.

The extension loads the complete catalog only from the configured remote HTTPS
URL. The default points to the raw catalog JSON in this repository; managed
rollouts can replace it with an organization-approved endpoint.

Set `azureIacGuardrail.catalogVersion` to require a specific approved catalog
version. If the selected catalog does not match, scanning fails closed instead
of silently using an unapproved control set.

## Hotfixes

Hotfixes are limited to critical security, correctness, installation, or data
exposure defects. The fix still requires targeted tests, review, release notes,
and a post-release follow-up issue when broader hardening is needed.

