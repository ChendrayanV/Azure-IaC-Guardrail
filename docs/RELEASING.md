# Releasing Azure IaC Guardrail

The repository has two GitHub Actions workflows:

- **Extension CI** validates pull requests and `main`, then uploads a VSIX.
- **Release VS Code Extension** validates release tags, publishes the VSIX to
  Visual Studio Marketplace, and creates a GitHub release with a checksum.

## One-time Marketplace setup

1. Create or identify a publisher at
   <https://marketplace.visualstudio.com/manage/publishers/>.
2. Create an Azure DevOps Personal Access Token with **Marketplace: Manage**
   scope and an appropriate expiration date.
3. In GitHub, create the repository variable:
   - `VSCE_PUBLISHER`: `ChendrayanVenkatesan`, the immutable Marketplace
     publisher ID. This must match `package.json`; it is separate from the
     user-facing extension display name.
4. In GitHub, create the `vscode-marketplace` environment.
5. Add the environment secret:
   - `VSCE_PAT`: the Azure DevOps Marketplace PAT.
6. Add required reviewers to the environment when releases need approval.

Never store the PAT in `package.json`, workflow YAML, a local tfvars file, or
repository documentation.

## Release process

1. Update `package.json` and `package-lock.json` to the same version:

   ```powershell
   npm version X.Y.Z --no-git-tag-version
   ```

2. Update `CHANGELOG.md`.
3. Confirm `README.md`, `USER_GUIDE.md`, and the wiki describe the current
   user experience, including Cloud Canvas behavior and catalog configuration.
4. Merge the release changes into `main`.
5. Create and push the matching tag:

   ```powershell
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```

The workflow rejects tags that do not exactly match `package.json`. A manual
workflow run validates and packages the current version but does not publish.

For every release, the expected pair is:

- `package.json` version: `X.Y.Z`
- Git tag: `vX.Y.Z`

Catalog-only releases do not have to change the VS Code extension version.
Keep catalog authoring in this repository, bump `catalog/VERSION`, regenerate
`azure-complete-catalog-vscode.json`, and publish the approved catalog artifact
to the HTTPS endpoint configured by `azureIacGuardrail.catalogUrl`. Marketplace
releases are still required when the extension runtime changes.

For release `0.1.9`, Cloud Canvas is a diagram-only workflow that generates
professional Azure architecture diagrams from Terraform configuration or local
plan files. It no longer exposes manual canvas authoring, Terraform generation,
Terraform preview, Draft From Image, or Validate + Static Scan actions.

## Recovery

- A failed validation or package job publishes nothing.
- A failed Marketplace publish does not create a GitHub release.
- Correct the cause, delete the failed tag when appropriate, and create a new
  version. Do not reuse a version already accepted by Marketplace.
- Rotate `VSCE_PAT` before expiration and immediately after suspected exposure.
