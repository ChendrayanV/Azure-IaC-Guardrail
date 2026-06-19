# Service Catalog Contributions

`catalog/services` is the only source of truth for built-in Cloud Canvas and
scanning metadata. Each Azure service has one JSON file named after its
`serviceId`.

Production and draft files are separated by folder:

```text
catalog/services/production/<service-id>.json
catalog/services/draft/<service-id>.json
```

Production files contribute controls and assurances to the generated runtime
catalog. Draft files keep service metadata available for Cloud Canvas, but
their controls and assurances are stripped until the file is promoted.

Current runtime coverage:

- 237 Cloud Canvas service and architecture entries.
- 26 production scanning service families.
- 143 production controls.
- 211 draft service metadata files.

Catalog contracts live under `catalog/schema`, and `catalog/VERSION` records
the version embedded in the generated runtime catalog.

## Add or change a service

1. Copy `catalog/service-template.json.example`.
2. Name the new file `catalog/services/draft/<service-id>.json`.
3. Add Canvas metadata, the original Microsoft SVG path, Terraform parameters,
   and controls in that one file.
4. Move the file to `catalog/services/production/` when at least one
   executable control is reviewed and ready to ship.
5. Run `npm run catalog:validate`, `npm run catalog:test`, `npm run check`, and
   `npm run lint`.
6. Commit the service file or folder move and regenerated
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
