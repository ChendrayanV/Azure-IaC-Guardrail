import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import completeCatalog from "../../azure-complete-catalog-vscode.json";

const root = path.resolve(".");
const servicesDirectory = path.join(root, "catalog", "services");
const productionServicesDirectory = path.join(servicesDirectory, "production");
const draftServicesDirectory = path.join(servicesDirectory, "draft");

describe("contributor service catalog", () => {
  it("has one source file for every generated service", () => {
    const productionFiles = fs
      .readdirSync(productionServicesDirectory)
      .filter((file) => file.endsWith(".json"))
      .sort();
    const draftFiles = fs
      .readdirSync(draftServicesDirectory)
      .filter((file) => file.endsWith(".json"))
      .sort();
    const files = [...productionFiles, ...draftFiles].sort();

    expect(files).toHaveLength(Object.keys(completeCatalog.services).length);
    expect(files).toEqual(
      Object.keys(completeCatalog.services)
        .map((serviceId) => `${serviceId}.json`)
        .sort(),
    );
    expect(draftFiles.length).toBeGreaterThan(0);
    expect(productionFiles.length).toBeGreaterThan(0);
    expect(completeCatalog.generatedFrom).toBe(
      "catalog/services/{production,draft}/*.json",
    );
  });

  it("keeps service and control identifiers unique", () => {
    const services = Object.values(completeCatalog.services);
    const servicesById = completeCatalog.services as Record<
      string,
      { controls: unknown[] }
    >;
    const controlIds = completeCatalog.controls.map((control) => control.id);

    expect(new Set(services.map((service) => service.serviceId)).size).toBe(
      services.length,
    );
    expect(new Set(controlIds).size).toBe(controlIds.length);
    for (const file of fs.readdirSync(productionServicesDirectory)) {
      if (!file.endsWith(".json")) continue;
      const serviceId = path.basename(file, ".json");
      expect(servicesById[serviceId].controls.length).toBeGreaterThan(0);
    }
    for (const file of fs.readdirSync(draftServicesDirectory)) {
      if (!file.endsWith(".json")) continue;
      const serviceId = path.basename(file, ".json");
      expect(servicesById[serviceId].controls).toEqual([]);
    }
  });

  it("contains complete scanning and Canvas metadata", () => {
    const storage = completeCatalog.services.storage_account;
    const logicApps = completeCatalog.services.logic_apps;
    const subnet = completeCatalog.services.subnet;
    const functions = completeCatalog.services.functions;
    const webApp = completeCatalog.services.web_app;
    const sqlDatabase = completeCatalog.services.sql_database;
    const azureSql = completeCatalog.services.azure_sql;

    expect(storage.icon).toMatch(/\.svg$/);
    expect(storage.terraform.resourceType).toBe("azurerm_storage_account");
    expect(storage.terraform.parameters.length).toBeGreaterThan(5);
    expect(storage.controls.length).toBeGreaterThan(10);
    expect(storage.controls[0]).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^AZ-/),
        remediation: expect.any(String),
        reference: expect.stringMatching(/^https:\/\/learn\.microsoft\.com\//),
      }),
    );
    expect(logicApps.canvas).toEqual(
      expect.objectContaining({
        variantParameterKey: "hostingModel",
        variants: expect.arrayContaining([
          expect.objectContaining({
            id: "standard",
            requiredDependencies: ["service_plan", "storage_account"],
          }),
          expect.objectContaining({
            id: "consumption",
            optionalDependencies: ["log_analytics"],
          }),
        ]),
      }),
    );
    expect(subnet.canvas?.variants[0]).toEqual(
      expect.objectContaining({
        id: "default",
        requiredDependencies: ["virtual_network"],
      }),
    );
    expect(functions.canvas?.variants[0]).toEqual(
      expect.objectContaining({
        requiredDependencies: ["service_plan", "storage_account"],
        optionalDependencies: ["subnet", "log_analytics"],
      }),
    );
    expect(webApp.canvas?.variants[0]).toEqual(
      expect.objectContaining({
        requiredDependencies: ["service_plan"],
        optionalDependencies: ["subnet", "log_analytics"],
      }),
    );
    expect(sqlDatabase.canvas?.variants[0]).toEqual(
      expect.objectContaining({
        requiredDependencies: ["sql_server"],
        optionalDependencies: ["subnet", "log_analytics"],
      }),
    );
    expect(azureSql.controls.map((control) => control.id)).toEqual([
      "AZ-AZSQL-001",
      "AZ-AZSQL-002",
      "AZ-AZSQL-003",
      "AZ-AZSQL-004",
    ]);
  });
});
