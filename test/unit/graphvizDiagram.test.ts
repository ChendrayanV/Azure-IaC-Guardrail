import { describe, expect, it } from "vitest";
import {
  renderGraphvizDot,
  renderGraphvizSvg,
} from "../../src/core/graphvizDiagram";
import { analyzeTerraformPlan } from "../../src/core/planAnalysis";

describe("renderGraphvizDot", () => {
  it("generates a GraphViz DOT diagram with Azure icons and labels", () => {
    const analysis = analyzeTerraformPlan(
      JSON.stringify({
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
      }),
      [],
    );

    const dot = renderGraphvizDot(analysis, {
      title: "Example architecture",
    });

    expect(dot).toContain("digraph AzureArchitecture");
    expect(dot).toContain('rankdir="LR"');
    expect(dot).toContain('"azurerm_storage_account.example" [');
    expect(dot).toContain("Storage Account");
    expect(dot).toContain('shape="box"');
    expect(dot).toContain(
      "media/cloud-canvas/Azure_Public_Service_Icons/Icons/general/10838-icon-service-Storage-Azure-Files.svg",
    );
    expect(dot).toContain("HIGH  PUBLIC  REPLACE");
    expect(dot).toContain(
      '"azurerm_private_endpoint.example" -> "azurerm_storage_account.example"',
    );
    expect(dot).toContain('label="private link"');
  });

  it("styles network and identity connectors distinctly", () => {
    const dot = renderGraphvizDot({
      nodes: [
        {
          address: "azurerm_linux_web_app.app",
          type: "azurerm_linux_web_app",
          name: "app",
          service: "Web App",
          changeAction: "create",
          risk: "low",
          publicExposure: false,
        },
        {
          address: "azurerm_subnet.app",
          type: "azurerm_subnet",
          name: "app",
          service: "Subnet",
          changeAction: "no-op",
          risk: "none",
          publicExposure: false,
        },
        {
          address: "azurerm_user_assigned_identity.app",
          type: "azurerm_user_assigned_identity",
          name: "app",
          service: "Managed Identity",
          changeAction: "no-op",
          risk: "none",
          publicExposure: false,
        },
      ],
      edges: [
        {
          source: "azurerm_linux_web_app.app",
          target: "azurerm_subnet.app",
          label: "virtual_network_subnet_id",
        },
        {
          source: "azurerm_linux_web_app.app",
          target: "azurerm_user_assigned_identity.app",
          label: "identity_ids",
        },
      ],
      changes: {
        create: 1,
        update: 0,
        delete: 0,
        replace: 0,
        "no-op": 2,
        read: 0,
      },
      blastRadius: [],
      riskScore: 3,
    });

    expect(dot).toContain('color="#1683ff"');
    expect(dot).toContain('label="network"');
    expect(dot).toContain('color="#7c3aed"');
    expect(dot).toContain('label="identity"');
    expect(dot).toContain('style="dashed"');
  });

  it("can render DOT to SVG through GraphViz WASM", async () => {
    const svg = await renderGraphvizSvg("digraph { app -> storage }");

    expect(svg).toContain("<svg");
    expect(svg).toContain("app");
    expect(svg).toContain("storage");
  });
});
