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

## Hotfixes

Hotfixes are limited to critical security, correctness, installation, or data
exposure defects. The fix still requires targeted tests, review, release notes,
and a post-release follow-up issue when broader hardening is needed.

