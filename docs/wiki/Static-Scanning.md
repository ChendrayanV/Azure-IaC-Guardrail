# Static Scanning

Run **Azure IaC Guardrail: Scan Terraform Files** for local feedback without
executing Terraform or contacting Azure.

Static scanning can resolve supported variable defaults, automatic tfvars,
selected tfvars, locals, primitive collections, interpolation, simple
conditionals, local modules, and previously downloaded registry or Git module
source.

Use **Select Static Scan Variable Files** to add environment files in explicit
precedence order. Findings preserve provenance and can point to the exact
tfvars assignment that produced a value.

Use **Initialize Modules and Scan Terraform Files** when remote module source
is missing. Guardrail runs `terraform init -backend=false`; it does not create
a plan or initialize a remote backend.

Provider functions, data sources, remote state, module outputs, dynamic
blocks, complex comprehensions, computed values, and exact `count` or
`for_each` instances remain **Plan required**.

See [Local Static Scan Scenarios](Local-Static-Scan-Scenarios) for the detailed
behavior matrix.
