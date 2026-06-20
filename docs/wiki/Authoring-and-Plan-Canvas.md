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

## Cloud Canvas generated diagrams

Run **Azure IaC Guardrail: Cloud Canvas** to generate a professional Azure
architecture diagram from the configured Terraform root or from a local plan
file.

The generated view infers Azure resources, relationships, public exposure
signals, change actions, and risk context from local Terraform inputs. It is a
read-only architecture review surface and does not provide manual drag-and-drop
editing.

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

Selecting a resource opens its inspector with dependencies, dependants,
exposure signals, risk, and action metadata. The generated diagram can be
exported as SVG.

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
