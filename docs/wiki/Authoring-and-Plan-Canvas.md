# Authoring and Plan Canvas

## Variable-aware offline scanning

Azure Pre-configuration stores a workspace-relative `terraformRoot` in
`.azure-iac-guardrail/profile.json`. Use the folder picker for monorepos so
static scanning, module initialization, variable selection, and local plans
all operate on the same root module. The value is `.` for the VS Code workspace
root or a path such as `infra/application`.

Azure IaC Guardrail resolves a bounded subset of Terraform expressions without
running Terraform:

- Variable defaults.
- `terraform.tfvars` and `*.auto.tfvars`.
- Workspace-selected variable files.
- Locals that depend on resolved variables or earlier locals.
- Strings, numbers, booleans, null, lists, maps, interpolation, and simple
  boolean conditionals.
- Nested local modules and registry or Git modules already downloaded by
  Terraform.
- Resolvable module inputs and cross-file resource relationships.

Run **Azure IaC Guardrail: Select Static Scan Variable Files** to save
environment-specific paths in `azureIacGuardrail.staticVarFiles`.

Uninitialized remote modules produce an explicit finding. The **Initialize
modules and rescan** action runs `terraform init -backend=false` and indexes
the downloaded source without creating a plan. Resolution remains
conservative: exact `count`/`for_each` module instances, data sources, remote
state, provider functions, module outputs, dynamic blocks, complex
comprehensions, and provider-computed values remain **Plan required**.

## Editor experience

Scans publish findings to the Problems panel. Hover text includes the control,
observed and expected values, remediation, and variable provenance. Quick
actions can rescan source, select variable files, initialize modules, or create
a resolved plan. Completion items are resource-aware and derived from the
active control catalog.

## Plan architecture canvas

Run **Azure IaC Guardrail: Open Terraform Plan Architecture**, or open it from
the Architecture Risk Graph after a plan scan.

The canvas renders only structural metadata:

- Terraform addresses and Azure service labels.
- Inferred resource dependencies.
- Planned actions, risk, public exposure, and failed-control counts.
- Search, action filters, risk filters, keyboard-selectable nodes, and details.
- SVG export without resolved attribute values, IDs, or secrets.
- Dependency-aware layout, curved labeled links, zoom, fit, pan, and
  selected-node connectivity highlighting.

## Cloud Canvas starting patterns

Run **Azure IaC Guardrail: Cloud Canvas (Preview)** and choose a starting tab:

- **Common Patterns** loads an editable AKS shared cluster, Web App with
  database, Event Hubs, Event Grid, or Service Bus architecture.
- **Blank Canvas** clears the current sketch and exposes the searchable Azure
  service catalog for free-form design.

The catalog tracks the Microsoft Azure products directory and contains more
than 200 unique products and architecture primitives. Newly added products
default to diagram-only/not-approved until governance review and Terraform
generation support are explicitly implemented.

Azure services use the Microsoft Azure Public Service Icons V23 SVG set when
the archive contains a direct or high-confidence match. Products newer than
the icon release use a neutral Azure resource icon. The **Generic
Architecture** category adds actors and technology-neutral components for
users, developers, architects, clients, applications, data, networking,
security, messaging, repositories, and external systems.

The Microsoft icon FAQ and terms of use are packaged with the extension in
`media/cloud-canvas`.

## Custom service catalog

Each file under `catalog/services/production` or `catalog/services/draft` owns
one service's:

- Category cards and original Microsoft SVG folder paths.
- Terraform resource-type selection.
- Required and governed inspector parameters.
- Expected control values, remediation guidance, references, and catalog
  provenance.

Use `npm run catalog:validate` to validate sources and rebuild
`azure-complete-catalog-vscode.json`. Production files contribute controls and
assurances. Draft files keep service metadata available for Cloud Canvas, but
their controls and assurances are stripped until the file is promoted.

The AKS pattern models multiple namespaces on one private cluster. Messaging
patterns include producer and worker applications, storage where appropriate,
and observability. Every loaded pattern remains fully editable and can be
validated, statically scanned, previewed, or generated as Terraform.

Left-drag a service to reposition it. Left-drag blank canvas space to pan in
both axes. Use `Ctrl+Z` and `Ctrl+Y` for undo and redo, and `Ctrl++` or
`Ctrl+-` for zoom. **Clear canvas** removes all services and connections.

Selecting a service opens its parameter inspector. The inspector includes all
settings currently supported by that service's Terraform template, such as
address ranges, SKUs, network exposure, TLS, AKS node configuration, database
settings, messaging capacity, queue or Event Hub settings, and log retention.
Changes flow into Terraform preview, validation, static scan, and generation.

## Terraform version policy

Azure Pre-configuration stores a Terraform `required_version` constraint in
the workspace profile. Cloud Canvas uses it when generating Terraform. The
setting does not install Terraform and does not rewrite existing repository
constraints.

Run **Azure IaC Guardrail: Compare Two Terraform Plans** for a baseline versus
candidate Markdown summary. Changed attribute names are included, but their
values are omitted to reduce plan-data exposure.

The latest successfully scanned plan is retained only in extension memory for
the current session. Binary plans remain subject to the configured cleanup and
retention policy.

## GitHub issue alignment

This increment advances:

- [#8 Cloud Canvas v2](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/8):
  common-pattern and blank-canvas tabs, zoom, undo/redo, connection deletion,
  validation, and export.
- [#9 Validated Terraform generation](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/9):
  isolated Terraform validation plus static controls before generation.
- [#10 Interactive architecture diagram](https://github.com/ChendrayanV/Azure-IaC-Guardrail/issues/10):
  resources, dependencies, exposure, findings, actions, deterministic layout,
  search, filters, details, and SVG export.

Those issues remain open until every acceptance criterion is complete.
