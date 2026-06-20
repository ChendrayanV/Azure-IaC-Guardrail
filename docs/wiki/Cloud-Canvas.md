# Cloud Canvas

**Status: Preview**

Run **Azure IaC Guardrail: Cloud Canvas** to generate an Azure architecture
diagram from local Terraform configuration or a local Terraform plan file.

Cloud Canvas supports:

- Generation from the configured Terraform root.
- Generation from a local `.tfplan` or `terraform show -json` file.
- Inferred Azure resources, relationships, public exposure signals, and risk.
- Search and filters for large diagrams.
- Resource inspection for dependencies and dependants.
- SVG export for architecture reviews and documentation.

Connections describe inferred architecture dependencies. Plan-file diagrams can
also include change action and risk context.

Cloud Canvas is generated-diagram only. Manual drag-and-drop authoring, service
palettes, undo/redo canvas editing, Terraform generation, Terraform preview,
Draft From Image, and Validate + Static Scan are removed from the canvas
experience.

Contributors extend Cloud Canvas and scanning together through
`catalog/services/draft/<service-id>.json` first. Move the file to
`catalog/services/production/<service-id>.json` when its executable controls
are reviewed and ready to ship.
