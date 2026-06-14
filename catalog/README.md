# Service Catalog Contributions

`catalog/services` is the only source of truth for built-in Cloud Canvas and
scanning metadata. Each Azure service has one JSON file named after its
`serviceId`.

Catalog contracts live under `catalog/schema`, and `catalog/VERSION` records
the version embedded in the generated runtime catalog.

## Add or change a service

1. Copy `catalog/service-template.json.example`.
2. Name the new file `catalog/services/<service-id>.json`.
3. Add Canvas metadata, the original Microsoft SVG path, Terraform parameters,
   and controls in that one file.
4. Run `npm run catalog:validate`, `npm run catalog:test`, `npm run check`, and
   `npm run lint`.
5. Commit the service file and regenerated
   `azure-complete-catalog-vscode.json`.

Do not edit `azure-complete-catalog-vscode.json` directly. It is the generated
runtime artifact used by both scanning and Cloud Canvas.

## Design rules

- Keep `serviceId` and the filename in lowercase snake_case.
- Use unique control IDs.
- Include Microsoft documentation for each control.
- Write actionable remediation without environment-specific IDs.
- Add compliant, non-compliant, unresolved, and plan-only tests as applicable.
- Use `assurances` for Azure platform guarantees that users cannot configure.
- Mark required Terraform parameters accurately.
- Preserve the SVG path beneath
  `media/cloud-canvas/Azure_Public_Service_Icons/Icons`.
