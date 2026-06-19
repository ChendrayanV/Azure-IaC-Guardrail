# Cloud Canvas

**Status: Preview**

Run **Azure IaC Guardrail: Cloud Canvas (Preview)** to design an Azure
architecture from a blank canvas or a supplied pattern.

Cloud Canvas supports:

- A searchable catalog of Azure services and generic architecture elements.
- AKS, Web App, Event Hubs, Event Grid, and Service Bus starting patterns.
- Directional connections, panning, zoom, undo, and redo.
- Service-specific Terraform parameters where implemented.
- Governance status for approved, under-review, and not-approved services.
- PNG export, Terraform preview, validation, static scanning, and explicit
  generation.

Connections describe Terraform dependency intent. A service can remain
diagram-only when no accurate Terraform mapping exists.

Generated Terraform is scaffolding, not deployment approval. Review names,
networking, identity, data protection, provider constraints, and organization
modules before use.

Contributors extend Cloud Canvas and scanning together through
`catalog/services/draft/<service-id>.json` first. Move the file to
`catalog/services/production/<service-id>.json` when its executable controls
are reviewed and ready to ship.
