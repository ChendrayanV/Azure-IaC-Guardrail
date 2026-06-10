# Changelog

All notable changes to Azure IaC Guardrail are documented here.

The project follows semantic versioning. Preview features may change before
their general-availability milestone.

## [Unreleased]

### Added

- GitHub Actions validation and Visual Studio Marketplace release automation.
- Tag and package-version validation for release safety.
- VSIX artifact checksums and generated GitHub release notes.
- Variable-aware offline scanning for defaults, automatic and selected tfvars,
  locals, primitive collections, interpolation, and simple conditionals.
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
- Cloud Canvas service coverage expanded to 218 searchable Azure products and
  architecture primitives, including current Foundry, data, compute,
  container, migration, networking, security, storage, and web offerings.
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
