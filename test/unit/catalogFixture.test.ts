import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import completeCatalog from "../../azure-complete-catalog-vscode.json";
import type { Control } from "../../src/types";
import { scanTerraform } from "../../src/core/scanner";

const root = path.resolve(".");
const standardsRoot = path.join(root, "catalog");
const storageFixture = path.join(root, "test/fixtures/storage-spa");
const threeTierFixture = path.join(
  root,
  "test/fixtures/three-tier-webapp",
);

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
  it("uses the released version in the generated complete catalog", () => {
    const version = fs
      .readFileSync(path.join(standardsRoot, "VERSION"), "utf8")
      .trim();
    const controlIds = completeCatalog.controls.map((control) => control.id);

    expect(completeCatalog.catalogVersion).toBe(version);
    expect(Object.keys(completeCatalog.services).length).toBe(237);
    expect(new Set(controlIds).size).toBe(controlIds.length);
  });

  it("defines structurally complete enforceable controls", () => {
    const controls = completeCatalog.controls;
    const validOperators = new Set([
      "equals",
      "notEquals",
      "exists",
      "oneOf",
      "contains",
      "relatedResourceExists",
    ]);

    expect(controls.length).toBeGreaterThanOrEqual(140);
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

  it("recognizes secure storage defaults in the maintained SPA fixture", () => {
    const controls = completeCatalog.services.storage_account.controls as Control[];
    const terraform = fs.readFileSync(
      path.join(storageFixture, "main.tf"),
      "utf8",
    );
    const expectedLine = terraform
      .split(/\r?\n/)
      .findIndex((line) =>
        line.includes("allow_nested_items_to_be_public") &&
        line.includes("false"),
      );

    const findings = scanTerraform(terraform, controls);
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
        name: "spa",
      },
      line: expectedLine,
    });
  });

  it("contains representative resources in maintained fixtures", () => {
    const terraform = [
      ...terraformFiles(storageFixture),
      ...terraformFiles(threeTierFixture),
    ]
      .map((fileName) => fs.readFileSync(fileName, "utf8"))
      .join("\n");

    for (const resourceType of [
      "azurerm_resource_group",
      "azurerm_storage_account",
      "azurerm_linux_web_app",
      "azurerm_service_plan",
      "azurerm_postgresql_flexible_server",
      "azurerm_virtual_network",
      "azurerm_subnet",
      "azurerm_private_dns_zone",
      "azurerm_log_analytics_workspace",
      "azurerm_application_insights",
      "azurerm_monitor_diagnostic_setting",
    ]) {
      expect(terraform).toContain(`resource "${resourceType}"`);
    }
  });

  it("recognizes secure App Service settings in the three-tier fixture", () => {
    const controls = completeCatalog.services.web_app.controls as Control[];
    const terraform = fs.readFileSync(
      path.join(threeTierFixture, "modules/app-tier/main.tf"),
      "utf8",
    );
    const findings = scanTerraform(terraform, controls);
    const expectedCompliantControls = [
      "AZ-WEB-001",
      "AZ-WEB-002",
      "AZ-WEB-003",
      "AZ-WEB-004",
      "AZ-WEB-005",
      "AZ-WEB-006",
      "AZ-WEB-007",
      "AZ-WEB-008",
      "AZ-WEB-009",
    ];

    for (const controlId of expectedCompliantControls) {
      expect(
        findings.find((finding) => finding.control.id === controlId),
      ).toMatchObject({ outcome: "compliant" });
    }
  });

  it("defines the requested storage standards and platform assurance", () => {
    const service = completeCatalog.services.storage_account;

    expect(service.controls.map((control) => control.id)).toEqual([
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
    expect(service.assurances).toEqual([
      expect.objectContaining({
        id: "AZ-STOR-010",
        implementation: "platform",
      }),
    ]);
  });
});
