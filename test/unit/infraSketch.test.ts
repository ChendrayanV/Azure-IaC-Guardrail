import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateTerraformFromSketch,
  normalizeInfraSketch,
  SKETCH_SERVICES,
  type InfraSketch,
} from "../../src/core/infraSketch";
import completeCatalog from "../../azure-complete-catalog-vscode.json";

describe("infrastructure sketch", () => {
  it("includes the broad Microsoft Azure product catalog", () => {
    const serviceIds = SKETCH_SERVICES.map((service) => service.type);
    const titles = SKETCH_SERVICES.map((service) => service.title);

    expect(SKETCH_SERVICES.length).toBeGreaterThanOrEqual(200);
    expect(new Set(serviceIds).size).toBe(serviceIds.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(serviceIds).toEqual(
      expect.arrayContaining([
        "foundry_agent_service",
        "compute_fleet",
        "kubernetes_fleet_manager",
        "documentdb",
        "deployment_environments",
        "operator_nexus",
        "health_data_services",
        "iot_operations",
        "azure_copilot",
        "storage_mover",
        "virtual_network_manager",
        "cloud_hsm",
        "managed_lustre",
        "static_web_apps",
      ]),
    );
  });

  it("maps every canvas item to a packaged SVG icon", () => {
    const serviceIds = SKETCH_SERVICES.map((service) => service.type).sort();

    expect(Object.keys(completeCatalog.services).sort()).toEqual(serviceIds);
    for (const service of Object.values(completeCatalog.services)) {
      expect(
        fs.existsSync(
          path.join(
            process.cwd(),
            "media",
            "cloud-canvas",
            "Azure_Public_Service_Icons",
            "Icons",
            service.icon,
          ),
        ),
      ).toBe(true);
    }
  });

  it("maps every canvas item to customizable parameters and controls", () => {
    const mappedServices = completeCatalog.services as Record<
      string,
      {
        icon: string;
        terraform: {
          resourceType: string | null;
          parameters: unknown[];
        };
        controls: unknown[];
      }
    >;
    const serviceIds = SKETCH_SERVICES.map((service) => service.type).sort();

    expect(Object.keys(mappedServices).sort()).toEqual(serviceIds);
    expect(
      Object.values(mappedServices).filter(
        (service) => service.terraform.resourceType,
      ).length,
    ).toBeGreaterThanOrEqual(40);
    expect(
      Object.values(mappedServices).flatMap((service) => service.controls)
        .length,
    ).toBeGreaterThanOrEqual(100);
  });

  it("includes generic IT architecture actors and components", () => {
    const genericServices = SKETCH_SERVICES.filter(
      (service) => service.category === "Generic Architecture",
    );

    expect(genericServices.map((service) => service.type)).toEqual(
      expect.arrayContaining([
        "generic_user",
        "generic_users",
        "generic_developer",
        "generic_architect",
        "generic_device",
        "generic_browser",
        "generic_internet",
        "generic_application",
        "generic_api",
        "generic_server",
        "generic_database",
        "generic_network",
        "generic_firewall",
        "generic_queue",
        "generic_repository",
        "generic_external_system",
      ]),
    );
  });

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

  it("generates an AKS shared-cluster pattern with namespaces", () => {
    const terraform = generateTerraformFromSketch({
      version: 1,
      nodes: [
        {
          id: "aks",
          serviceType: "kubernetes_service",
          name: "aks-platform",
          region: "uksouth",
          x: 20,
          y: 20,
        },
        {
          id: "subnet",
          serviceType: "subnet",
          name: "snet-aks",
          region: "uksouth",
          x: 20,
          y: 180,
        },
        {
          id: "namespace",
          serviceType: "kubernetes_namespace",
          name: "Team Payments",
          region: "uksouth",
          x: 300,
          y: 20,
        },
      ],
      connections: [
        { id: "edge-1", source: "aks", target: "subnet" },
        { id: "edge-2", source: "namespace", target: "aks" },
      ],
    });

    expect(terraform).toContain(
      'resource "azurerm_kubernetes_cluster" "aks_platform"',
    );
    expect(terraform).toContain(
      "vnet_subnet_id = azurerm_subnet.snet_aks.id",
    );
    expect(terraform).toContain(
      'resource "kubernetes_namespace" "team_payments"',
    );
    expect(terraform).toContain('name = "team-payments"');
    expect(terraform).toContain(
      "depends_on = [azurerm_kubernetes_cluster.aks_platform]",
    );
  });

  it("generates common messaging services", () => {
    const terraform = generateTerraformFromSketch({
      version: 1,
      nodes: [
        {
          id: "event-hubs",
          serviceType: "event_hubs",
          name: "evh-stream-prod",
          region: "uksouth",
          x: 20,
          y: 20,
        },
        {
          id: "event-grid",
          serviceType: "event_grid",
          name: "egt-events-prod",
          region: "uksouth",
          x: 300,
          y: 20,
        },
        {
          id: "service-bus",
          serviceType: "service_bus",
          name: "sbn-messages-prod",
          region: "uksouth",
          x: 580,
          y: 20,
        },
      ],
      connections: [],
    });

    expect(terraform).toContain(
      'resource "azurerm_eventhub_namespace" "evh_stream_prod"',
    );
    expect(terraform).toContain(
      'resource "azurerm_eventhub" "evh_stream_prod_events"',
    );
    expect(terraform).toContain(
      'resource "azurerm_eventgrid_topic" "egt_events_prod"',
    );
    expect(terraform).toContain(
      'resource "azurerm_servicebus_namespace" "sbn_messages_prod"',
    );
    expect(terraform).toContain(
      'resource "azurerm_servicebus_queue" "sbn_messages_prod_messages"',
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

  it("uses the workspace Terraform version in generated configuration", () => {
    const terraform = generateTerraformFromSketch(
      {
        version: 1,
        nodes: [
          {
            id: "rg",
            serviceType: "resource_group",
            name: "rg-example",
            region: "uksouth",
            x: 0,
            y: 0,
          },
        ],
        connections: [],
      },
      ">= 1.9.0, < 2.0.0",
    );

    expect(terraform).toContain(
      'required_version = ">= 1.9.0, < 2.0.0"',
    );
  });

  it("preserves service parameters and uses them in generated Terraform", () => {
    const sketch = normalizeInfraSketch({
      version: 1,
      nodes: [
        {
          id: "event-hubs",
          serviceType: "event_hubs",
          name: "evh-custom",
          region: "uksouth",
          x: 20,
          y: 20,
          parameters: {
            sku: "Premium",
            capacity: 2,
            publicNetworkAccess: true,
            localAuthentication: true,
            eventHubName: "telemetry",
            partitionCount: 8,
            messageRetention: 3,
          },
        },
      ],
      connections: [],
    });

    expect(sketch.nodes[0].parameters).toEqual({
      sku: "Premium",
      capacity: 2,
      publicNetworkAccess: true,
      localAuthentication: true,
      eventHubName: "telemetry",
      partitionCount: 8,
      messageRetention: 3,
    });

    const terraform = generateTerraformFromSketch(sketch);
    expect(terraform).toContain('sku                           = "Premium"');
    expect(terraform).toContain("capacity                      = 2");
    expect(terraform).toContain("public_network_access_enabled = true");
    expect(terraform).toContain("local_authentication_enabled  = true");
    expect(terraform).toContain('name              = "telemetry"');
    expect(terraform).toContain("partition_count   = 8");
    expect(terraform).toContain("message_retention = 3");
  });

  it("generates a mapped prototype for a catalog-backed service", () => {
    const terraform = generateTerraformFromSketch({
      version: 1,
      nodes: [
        {
          id: "apim",
          serviceType: "api_management",
          name: "apim-prototype",
          region: "uksouth",
          x: 20,
          y: 20,
          parameters: {
            publisher_name: "Platform Engineering",
            publisher_email: "platform@example.com",
            sku_name: "Developer_1",
          },
        },
      ],
      connections: [],
    });

    expect(terraform).toContain(
      'resource "azurerm_api_management" "apim_prototype"',
    );
    expect(terraform).toContain(
      'publisher_name = "Platform Engineering"',
    );
    expect(terraform).toContain(
      'publisher_email = "platform@example.com"',
    );
    expect(terraform).toContain('sku_name = "Developer_1"');
  });

  it("keeps governed canvas statuses unique and linked to known services", () => {
    const knownServices = new Set(SKETCH_SERVICES.map((service) => service.type));
    expect(
      Object.keys(completeCatalog.services).every((service) =>
        knownServices.has(service),
      ),
    ).toBe(true);
  });
});
