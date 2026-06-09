import { describe, expect, it } from "vitest";
import {
  generateTerraformFromSketch,
  normalizeInfraSketch,
  SKETCH_SERVICES,
  type InfraSketch,
} from "../../src/core/infraSketch";
import serviceStatus from "../../src/data/cloudCanvasServiceStatus.json";

describe("infrastructure sketch", () => {
  it("normalizes nodes and connections", () => {
    const sketch = normalizeInfraSketch({
      nodes: [
        {
          id: "rg",
          serviceType: "resource_group",
          name: "rg-app",
          region: "UK South",
          x: 50,
          y: 60,
        },
        {
          id: "storage",
          serviceType: "storage_account",
          name: "st-app",
          region: "uksouth",
          x: 300,
          y: 60,
        },
      ],
      connections: [
        { id: "edge-1", source: "storage", target: "rg" },
      ],
    });

    expect(sketch.nodes[0].region).toBe("uksouth");
    expect(sketch.connections).toEqual([
      { id: "edge-1", source: "storage", target: "rg" },
    ]);
  });

  it("generates connected Terraform with secure defaults", () => {
    const sketch: InfraSketch = {
      version: 1,
      nodes: [
        {
          id: "rg",
          serviceType: "resource_group",
          name: "rg-app",
          region: "uksouth",
          x: 40,
          y: 40,
        },
        {
          id: "vnet",
          serviceType: "virtual_network",
          name: "vnet-app",
          region: "uksouth",
          x: 280,
          y: 40,
        },
        {
          id: "subnet",
          serviceType: "subnet",
          name: "snet-app",
          region: "uksouth",
          x: 520,
          y: 40,
        },
        {
          id: "storage",
          serviceType: "storage_account",
          name: "st-app-001",
          region: "uksouth",
          x: 280,
          y: 220,
        },
        {
          id: "nsg",
          serviceType: "network_security_group",
          name: "nsg-app",
          region: "uksouth",
          x: 520,
          y: 220,
        },
      ],
      connections: [
        { id: "edge-1", source: "subnet", target: "vnet" },
        { id: "edge-2", source: "storage", target: "rg" },
        { id: "edge-3", source: "subnet", target: "nsg" },
      ],
    };

    const terraform = generateTerraformFromSketch(sketch);

    expect(terraform).toContain(
      'resource "azurerm_resource_group" "rg_app"',
    );
    expect(terraform).toContain(
      'resource "azurerm_virtual_network" "vnet_app"',
    );
    expect(terraform).toContain(
      "virtual_network_name = azurerm_virtual_network.vnet_app.name",
    );
    expect(terraform).toContain(
      "public_network_access_enabled   = false",
    );
    expect(terraform).toContain(
      "depends_on = [azurerm_resource_group.rg_app]",
    );
    expect(terraform).toContain(
      'resource "azurerm_network_security_group" "nsg_app"',
    );
    expect(terraform).toContain(
      'resource "azurerm_subnet_network_security_group_association" "snet_app_nsg_app"',
    );
    expect(terraform).toContain(
      "network_security_group_id = azurerm_network_security_group.nsg_app.id",
    );
  });

  it("creates a supporting resource group when none is sketched", () => {
    const terraform = generateTerraformFromSketch({
      version: 1,
      nodes: [
        {
          id: "logs",
          serviceType: "log_analytics",
          name: "log-app",
          region: "ukwest",
          x: 20,
          y: 20,
        },
      ],
      connections: [],
    });

    expect(terraform).toContain(
      'resource "azurerm_resource_group" "sketch"',
    );
    expect(terraform).toContain(
      "resource_group_name = azurerm_resource_group.sketch.name",
    );
  });

  it("keeps catalog-only Azure services in diagrams", () => {
    const sketch = normalizeInfraSketch({
      nodes: [
        {
          id: "aks",
          serviceType: "kubernetes_service",
          name: "aks-platform",
          region: "uksouth",
          x: 20,
          y: 20,
        },
      ],
      connections: [],
    });

    expect(sketch.nodes[0].serviceType).toBe("kubernetes_service");
    expect(generateTerraformFromSketch(sketch)).toContain(
      "# aks-platform (kubernetes_service) was not generated.",
    );
  });

  it("generates dependencies in both directions for two-way connections", () => {
    const terraform = generateTerraformFromSketch({
      version: 1,
      nodes: [
        {
          id: "vnet",
          serviceType: "virtual_network",
          name: "vnet-app",
          region: "uksouth",
          x: 20,
          y: 20,
        },
        {
          id: "nsg",
          serviceType: "network_security_group",
          name: "nsg-app",
          region: "uksouth",
          x: 300,
          y: 20,
        },
      ],
      connections: [
        {
          id: "edge-1",
          source: "vnet",
          target: "nsg",
          bidirectional: true,
        },
      ],
    });

    expect(terraform).toContain(
      "depends_on = [azurerm_network_security_group.nsg_app]",
    );
    expect(terraform).toContain(
      "depends_on = [azurerm_virtual_network.vnet_app]",
    );
  });

  it("keeps every canvas service synchronized with the governance registry", () => {
    const knownServices = new Set(SKETCH_SERVICES.map((service) => service.type));
    const registeredServices = [
      ...serviceStatus.approved,
      ...serviceStatus.underReview,
      ...serviceStatus.notApproved,
    ];
    const uniqueRegisteredServices = new Set(registeredServices);

    expect(uniqueRegisteredServices.size).toBe(registeredServices.length);
    expect([...uniqueRegisteredServices].sort()).toEqual(
      [...knownServices].sort(),
    );
  });
});
