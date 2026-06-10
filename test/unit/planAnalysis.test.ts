import { describe, expect, it } from "vitest";
import { analyzeTerraformPlan } from "../../src/core/planAnalysis";

describe("analyzeTerraformPlan", () => {
  it("builds relationships and flags public replacement risk", () => {
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_storage_account.example",
              mode: "managed",
              type: "azurerm_storage_account",
              name: "example",
              values: {
                id: "/storage/example",
                public_network_access_enabled: true,
              },
            },
            {
              address: "azurerm_private_endpoint.example",
              mode: "managed",
              type: "azurerm_private_endpoint",
              name: "example",
              values: {
                private_service_connection: [
                  {
                    private_connection_resource_id: "/storage/example",
                  },
                ],
              },
            },
          ],
        },
      },
      resource_changes: [
        {
          address: "azurerm_storage_account.example",
          mode: "managed",
          change: { actions: ["delete", "create"] },
        },
        {
          address: "azurerm_private_endpoint.example",
          mode: "managed",
          change: { actions: ["create"] },
        },
      ],
    });

    const analysis = analyzeTerraformPlan(plan, []);

    expect(analysis.edges).toContainEqual({
      source: "azurerm_private_endpoint.example",
      target: "azurerm_storage_account.example",
      label: "private_connection_resource_id",
    });
    expect(analysis.changes.replace).toBe(1);
    expect(analysis.nodes[0]).toMatchObject({
      publicExposure: true,
      risk: "high",
    });
    expect(analysis.blastRadius[0]).toMatchObject({
      address: "azurerm_storage_account.example",
      risk: "high",
    });
    expect(analysis.riskScore).toBeGreaterThan(0);
  });

  it("uses Terraform configuration references for plan connectivity", () => {
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_resource_group.example",
              mode: "managed",
              type: "azurerm_resource_group",
              name: "example",
              values: { name: "rg-example" },
            },
            {
              address: "azurerm_virtual_network.example",
              mode: "managed",
              type: "azurerm_virtual_network",
              name: "example",
              values: { name: "vnet-example" },
            },
          ],
        },
      },
      configuration: {
        root_module: {
          resources: [
            {
              address: "azurerm_virtual_network.example",
              expressions: {
                resource_group_name: {
                  references: ["azurerm_resource_group.example.name"],
                },
              },
            },
          ],
        },
      },
    });

    expect(analyzeTerraformPlan(plan, []).edges).toContainEqual({
      source: "azurerm_virtual_network.example",
      target: "azurerm_resource_group.example",
      label: "resource_group_name",
    });
  });
});
