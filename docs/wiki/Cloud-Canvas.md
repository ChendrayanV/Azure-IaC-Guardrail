# Cloud Canvas

**Status: Preview**

Run **Azure IaC Guardrail: Cloud Canvas** to generate an Azure architecture
diagram from local Terraform configuration.

Cloud Canvas supports:

- Generation from the configured Terraform root.
- Inferred Azure resources, relationships, public exposure signals, and risk.
- Static GraphViz preview for architecture reviews and documentation.
- Editable SVG source for manual diagram touch-ups.
- DOT and SVG export.

Connections describe inferred architecture dependencies from Terraform
references.

Cloud Canvas is generated-diagram only. Manual drag-and-drop authoring, service
palettes, undo/redo canvas editing, Terraform generation, Terraform preview,
Draft From Image, plan-file generation, and Validate + Static Scan are removed
from the canvas experience.

Contributors extend Cloud Canvas and scanning together through
`catalog/services/draft/<service-id>.json` first. Move the file to
`catalog/services/production/<service-id>.json` when its executable controls
are reviewed and ready to ship.
