import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { scanTerraform } from "../../src/core/scanner";
import type { ControlCatalog } from "../../src/types";

const root = path.resolve(".");
const standardsRoot = path.join(root, "azure-infrastructure-standards");
const controlsDirectory = path.join(standardsRoot, "controls");

function readCatalog(fileName: string): ControlCatalog {
  return JSON.parse(
    fs.readFileSync(path.join(controlsDirectory, fileName), "utf8"),
  ) as ControlCatalog;
}

function terraformFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".terraform") {
      return [];
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return terraformFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".tf")
      ? [entryPath]
      : [];
  });
}

describe("bundled standards", () => {
  it("uses the released version across valid domain catalogs", () => {
    const version = fs
      .readFileSync(path.join(standardsRoot, "VERSION"), "utf8")
      .trim();
    const catalogFiles = fs
      .readdirSync(controlsDirectory)
      .filter((fileName) => fileName.endsWith(".json"));
    const catalogs = catalogFiles.map(readCatalog);
    const controlIds = catalogs.flatMap((catalog) =>
      catalog.controls.map((control) => control.id),
    );

    expect(catalogFiles.sort()).toEqual([
      "ai.json",
      "application-platform.json",
      "compute.json",
      "containers.json",
      "databases.json",
      "integration.json",
      "key-vault.json",
      "monitoring.json",
      "networking.json",
      "resource-group.json",
      "storage.json",
    ]);
    expect(catalogs.every((catalog) => catalog.catalogVersion === version))
      .toBe(true);
    expect(new Set(controlIds).size).toBe(controlIds.length);
    expect(
      catalogs.every((catalog) => Array.isArray(catalog.controls)),
    ).toBe(true);
  });

  it("defines structurally complete enforceable controls", () => {
    const controls = fs
      .readdirSync(controlsDirectory)
      .filter((fileName) => fileName.endsWith(".json"))
      .map(readCatalog)
      .flatMap((catalog) => catalog.controls);
    const validOperators = new Set([
      "equals",
      "notEquals",
      "exists",
      "oneOf",
      "contains",
      "relatedResourceExists",
    ]);

    expect(controls.length).toBeGreaterThanOrEqual(110);
    for (const control of controls) {
      expect(control.id).toMatch(/^[A-Z0-9-]+$/);
      expect(control.title.length).toBeGreaterThan(0);
      expect(control.description.length).toBeGreaterThan(0);
      expect(control.resourceTypes.length).toBeGreaterThan(0);
      expect(control.attribute.length).toBeGreaterThan(0);
      expect(validOperators.has(control.operator)).toBe(true);
      expect(control.remediation?.length).toBeGreaterThan(0);
      expect(control.reference).toMatch(
        /^https:\/\/learn\.microsoft\.com\//,
      );
      if (control.benchmarkReference) {
        expect(control.benchmarkReference).toMatch(
          /^https:\/\/avd\.aquasec\.com\//,
        );
      }

      if (
        control.operator !== "exists" &&
        control.operator !== "relatedResourceExists"
      ) {
        expect(control.expected).toBeDefined();
      }
      if (control.operator === "relatedResourceExists") {
        expect(control.relatedResourceType).toBeDefined();
        expect(control.relatedMatchAttribute).toBeDefined();
        if (control.relatedConditionAttribute) {
          expect(control.expected).toBeDefined();
        }
      }
    }
  });

  it("recognizes secure storage defaults in the production fixture", () => {
    const catalog = readCatalog("storage.json");
    const terraform = fs.readFileSync(
      path.join(
        root,
        "test/fixtures/production/modules/storage/main.tf",
      ),
      "utf8",
    );
    const expectedLine = terraform
      .split(/\r?\n/)
      .findIndex((line) =>
        line.includes("allow_nested_items_to_be_public") &&
        line.includes("false"),
      );

    const findings = scanTerraform(terraform, catalog.controls);
    const publicAccessFinding = findings.find(
      (finding) => finding.control.id === "AZ-STOR-001",
    );

    expect(publicAccessFinding).toMatchObject({
      outcome: "compliant",
      actual: "false",
      expected: false,
      control: { id: "AZ-STOR-001" },
      resource: {
        type: "azurerm_storage_account",
        name: "this",
      },
      line: expectedLine,
    });
  });

  it("contains the requested production service resources", () => {
    const fixtureDirectory = path.join(root, "test/fixtures/production");
    const terraform = terraformFiles(fixtureDirectory)
      .map((fileName) => fs.readFileSync(fileName, "utf8"))
      .join("\n");

    for (const resourceType of [
      "azurerm_application_gateway",
      "azurerm_storage_account",
      "azurerm_linux_web_app",
      "azurerm_linux_virtual_machine_scale_set",
      "azurerm_key_vault",
      "azurerm_mssql_server",
      "azurerm_mssql_database",
      "azurerm_log_analytics_workspace",
      "azurerm_application_insights",
      "azurerm_user_assigned_identity",
    ]) {
      expect(terraform).toContain(`resource "${resourceType}"`);
    }

    for (const platformOwnedType of [
      "azurerm_virtual_network",
      "azurerm_subnet",
      "azurerm_network_security_group",
      "azurerm_route_table",
      "azurerm_nat_gateway",
      "azurerm_private_dns_zone",
      "azurerm_public_ip",
    ]) {
      expect(terraform).not.toContain(`resource "${platformOwnedType}"`);
    }
  });

  it("has no statically non-compliant production fixture resources", () => {
    const fixtureDirectory = path.join(root, "test/fixtures/production");
    const controls = fs
      .readdirSync(controlsDirectory)
      .filter((fileName) => fileName.endsWith(".json"))
      .map(readCatalog)
      .flatMap((catalog) => catalog.controls);
    const findings = terraformFiles(fixtureDirectory).flatMap(
      (fileName) =>
        scanTerraform(
          fs.readFileSync(fileName, "utf8"),
          controls,
        ),
    );

    expect(
      findings.filter((finding) => finding.outcome === "noncompliant"),
    ).toEqual([]);
  });

  it("defines the requested storage standards and platform assurance", () => {
    const catalog = readCatalog("storage.json");

    expect(catalog.controls.map((control) => control.id)).toEqual([
      "AZ-STOR-001",
      "AZ-STOR-002",
      "AZ-STOR-003",
      "AZ-STOR-004",
      "AZ-STOR-005",
      "AZ-STOR-006",
      "AZ-STOR-007",
      "AZ-STOR-008",
      "AZ-STOR-009",
      "AZ-STOR-011",
      "AZ-STOR-012",
      "AZ-STOR-013",
      "AZ-STOR-014",
      "AZ-STOR-015",
      "AZ-STOR-016",
      "AZ-STOR-017",
      "AZ-STOR-018",
      "AZ-STOR-019",
      "AZ-STOR-020",
      "AZ-STOR-021",
    ]);
    expect(catalog.assurances).toEqual([
      expect.objectContaining({
        id: "AZ-STOR-010",
        implementation: "platform",
      }),
    ]);
  });
});
