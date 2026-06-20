# Changelog

All notable changes to Azure IaC Guardrail are documented here.

The project follows semantic versioning. Preview features may change before
their general-availability milestone.

## [Unreleased]

## [0.1.9] - 2026-06-20

### Added

- Decoupled the guardrail catalog from the extension runtime with an enforced
  remote complete catalog source.
- Added the editable **Remote catalog URL** field to Azure Pre-configuration,
  defaulting to the raw `azure-complete-catalog-vscode.json` endpoint in this
  repository.
- Added optional catalog version pinning so teams can hold the extension to an
  approved catalog release while still managing catalog content in this repo.
- Redesigned Cloud Canvas as a generated Azure architecture diagram experience
  from local Terraform configuration or plan files, removing manual
  drag-and-drop authoring, palette controls, Terraform generation, Terraform
  preview, Draft From Image, and Validate + Static Scan actions.

### Changed

- Updated end-user, release, and wiki documentation for the remote-catalog
  runtime model and the diagram-only Cloud Canvas workflow.

## [0.1.7] - 2026-06-19

### Fixed

- Made the workspace profile JSON error test path-separator neutral so release
  validation passes consistently across Windows and POSIX-style paths.

## [0.1.6] - 2026-06-19

### Changed

- Split built-in service catalog sources into production and draft folders so
  users can clearly distinguish available scanning controls from future
  service metadata.
- Clarified that production scanning currently covers 26 Azure service
  families with 143 controls.
- Preserved the full 237-entry Cloud Canvas catalog while stripping draft
  controls and assurances from the generated runtime catalog until promotion.
- Updated contributor guidance for promoting draft services into production
  scanning coverage.

## [0.1.3] - 2026-06-17

### Changed

- Cloud Canvas now always opens as a blank workspace instead of restoring the
  previous sketch.
- Removed the Cloud Canvas starter-pattern entry point and the separate
  `Start blank canvas` action to simplify first use.
- Added a Cloud Canvas dark-view toggle for demos and longer design sessions.
- Tightened the release dependency graph by pinning the patched
  `form-data` transitive dependency used during packaging.
- Cleaned up Cloud Canvas webview script helpers so lint and release pipeline
  validation pass cleanly.

## [0.1.2] - 2026-06-14

### Changed

- Replaced the extension and report logo with the circular infrastructure
  inspection lens.
- Replaced the placeholder extension publisher with the
  `azure-iac-guardrail` publisher ID.
- Refreshed the Marketplace README with a compact centered logo, CI and
  release status, quality indicators, and clearer product workflow visuals.
- Consolidated service standards, schemas, and catalog versioning under
  `catalog/`.
- Added a minimum-supported VS Code Extension Host smoke test to CI and release
  validation.
- Made Marketplace publisher identity immutable between source and release
  artifacts.

### Added

- GitHub Actions validation and Visual Studio Marketplace release automation.
- Tag and package-version validation for release safety.
- VSIX artifact checksums and generated GitHub release notes.
- Variable-aware offline scanning for defaults, automatic and selected tfvars,
  locals, primitive collections, interpolation, and simple conditionals.
- Module-aware static scanning for nested local modules and initialized
  registry or Git modules, including input propagation, workspace-wide
  relationship checks, unresolved-module diagnostics, and a backend-disabled
  initialize-and-rescan action.
- Resource-aware Terraform completion suggestions and explicit plan-required
  reporting for module `count` and `for_each` expansion.
- Source-aware editor diagnostics now mark the originating `.tfvars`
  assignment, link back to the affected resource, provide plain-language
  hover guidance, and offer safe one-click scalar replacements.
- Nested Terraform blocks such as App Service `site_config` and `identity` are
  evaluated statically when values are visible. Plan-only diagnostic lists are
  collapsed into one informational summary per resource.
- IntelliSense suggestions are filtered to the current resource and nested
  block, with human-readable labels and recommended values.
- Added a pinned downloaded registry-module fixture using
  `Azure/vnet/azurerm` 5.0.1, plus a complete local static-scan scenario matrix
  covering local, cached remote, missing, dynamic, repeated, variable-driven,
  nested-block, cross-resource, and plan-required cases.
- Added an intentionally misconfigured IntelliSense UX fixture demonstrating
  exact `.tfvars` diagnostics, nested App Service findings, resource-aware
  completions, plain-language hover guidance, and preferred one-click fixes.
- Azure Pre-configuration now includes a Terraform root folder picker,
  workspace-relative path entry, live path preview, and workspace-root reset.
  The persisted `terraformRoot` drives static scans, cached-module indexing,
  initialization, variable-file selection, and local plan generation.
- Terraform diagnostics, hover explanations, governed completions, and quick
  actions in VS Code.
- Interactive plan architecture canvas with dependency, change, risk,
  exposure, search, filtering, detail, and SVG export support.
- Two-plan comparison with added, removed, changed, and unchanged resource
  summaries and value-safe changed-attribute reporting.
- Cloud Canvas sample architecture, zoom, undo/redo, and combined Terraform
  validation plus static control scanning.
- Cloud Canvas starting tabs for common patterns and a blank canvas, including
  AKS shared namespaces, three-tier Web App, Event Hubs, Event Grid, and
  Service Bus templates with Terraform generation.
- Cloud Canvas service parameter inspector, two-axis left-drag panning,
  standard undo/redo and zoom shortcuts, and a single full-canvas clear
  action. The separate Save Sketch control was removed.
- Cloud Canvas now uses the locally bundled Montserrat typeface and reliably
  clears all services and connections while keeping the action undoable.
- Cloud Canvas service coverage expanded to 237 searchable Azure products and
  architecture primitives, including current Foundry, data, compute,
  container, migration, networking, security, storage, and web offerings.
- Cloud Canvas now renders mapped Microsoft Azure Public Service Icons V23
  SVGs and includes a Generic Architecture category for actors, clients,
  applications, infrastructure, networking, security, and integration
  components.
- Replaced split mapping and control sources with contributor-friendly
  `catalog/services/<service-id>.json` files. One generated complete catalog
  now powers scanning, remediation, Canvas parameters, icons, and Terraform
  prototypes.
- Redesigned Azure Pre-configuration dashboard with a persisted Terraform
  version constraint for generated Cloud Canvas Terraform.
- Redesigned plan architecture canvas with configuration-reference
  connectivity, dependency-aware layout, curved labeled links, zoom, fit, pan,
  and selected-resource path highlighting.

## [0.1.0] - 2026-06-09

### Added

- Static and resolved Terraform plan compliance scans.
- Architecture risk and pull-request blast-radius analysis.
- Workspace pre-configuration, governed exceptions, and evidence exports.
- Resource Cost Preview and Sketch Your Infra Preview.
