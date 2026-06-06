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
      "databases.json",
      "key-vault.json",
      "networking.json",
      "storage.json",
    ]);
    expect(catalogs.every((catalog) => catalog.catalogVersion === version))
      .toBe(true);
    expect(new Set(controlIds).size).toBe(controlIds.length);
    expect(
      catalogs.every((catalog) => Array.isArray(catalog.controls)),
    ).toBe(true);
  });

  it("requires a plan to resolve the public access control", () => {
    const catalog = readCatalog("storage.json");
    const terraform = fs.readFileSync(
      path.join(root, "test/fixtures/noncompliant/main.tf"),
      "utf8",
    );
    const expectedLine = terraform
      .split(/\r?\n/)
      .findIndex((line) =>
        line.includes(
          "allow_nested_items_to_be_public = var.allow_public_access",
        ),
      );

    const findings = scanTerraform(terraform, catalog.controls);
    const publicAccessFinding = findings.find(
      (finding) => finding.control.id === "AZ-STOR-001",
    );

    expect(publicAccessFinding).toMatchObject({
      outcome: "unresolved",
      actual: "var.allow_public_access",
      expected: false,
      control: { id: "AZ-STOR-001" },
      resource: {
        type: "azurerm_storage_account",
        name: "example",
      },
      line: expectedLine,
    });
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
    ]);
    expect(catalog.assurances).toEqual([
      expect.objectContaining({
        id: "AZ-STOR-010",
        implementation: "platform",
      }),
    ]);
  });
});
