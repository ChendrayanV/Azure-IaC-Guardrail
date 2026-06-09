import { describe, expect, it, vi } from "vitest";
import { estimateTerraformPlanCosts } from "../../src/core/costEstimator";

describe("estimateTerraformPlanCosts", () => {
  it("prices fixed hourly compute and separates usage-dependent storage", async () => {
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      const items = url.includes("serviceName+eq+%27Storage%27")
        ? [
            {
              currencyCode: "USD",
              retailPrice: 0.0192,
              meterName: "Hot LRS Data Stored",
              unitOfMeasure: "1 GB/Month",
              type: "Consumption",
              tierMinimumUnits: 0,
            },
            {
              currencyCode: "USD",
              retailPrice: 0.0047,
              meterName: "Hot Read Operations",
              unitOfMeasure: "10K",
              type: "Consumption",
              tierMinimumUnits: 0,
            },
            {
              currencyCode: "USD",
              retailPrice: 0.059,
              meterName: "Hot LRS Write Operations",
              unitOfMeasure: "10K",
              type: "Consumption",
              tierMinimumUnits: 0,
            },
          ]
        : [
            {
              currencyCode: "USD",
              retailPrice: 0.1,
              armSkuName: "Standard_D2s_v5",
              skuName: "Standard_D2s_v5",
              meterName: "D2s v5",
              productName: "Virtual Machines Dsv5 Series",
              unitOfMeasure: "1 Hour",
              type: "Consumption",
              isPrimaryMeterRegion: true,
            },
          ];
      return new Response(JSON.stringify({ Items: items }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_linux_virtual_machine.example",
              type: "azurerm_linux_virtual_machine",
              values: {
                location: "uksouth",
                size: "Standard_D2s_v5",
                zones: ["1"],
              },
            },
            {
              address: "azurerm_storage_account.example",
              type: "azurerm_storage_account",
              values: {
                name: "stexample",
                location: "uksouth",
                account_tier: "Standard",
                account_replication_type: "LRS",
                access_tier: "Hot",
              },
            },
            {
              address: "azurerm_resource_group.example",
              type: "azurerm_resource_group",
              values: {
                location: "uksouth",
              },
            },
            {
              address: "azurerm_storage_account_static_website.example",
              type: "azurerm_storage_account_static_website",
              values: {},
            },
            {
              address: "azurerm_storage_blob.index",
              type: "azurerm_storage_blob",
              values: {
                storage_account_name: "stexample",
                source_content: "<html>Hello</html>",
              },
            },
          ],
        },
      },
    });

    const result = await estimateTerraformPlanCosts(plan, { fetchImpl });

    expect(result.knownMonthlyCost).toBe(73.13);
    expect(result.estimatedResources).toBe(2);
    expect(result.usageDependentResources).toBe(0);
    expect(result.omittedResources).toBe(3);
    expect(result.resources[0]).toMatchObject({
      status: "estimated",
      monthlyCost: 73,
      factors: {
        region: "uksouth",
        size: "Standard_D2s_v5",
        zones: "1",
        os: "Linux",
      },
    });
    expect(result.resources[1]).toMatchObject({
      address: "azurerm_storage_account.example",
      status: "estimated",
      monthlyCost: 0.13,
      factors: {
        region: "uksouth",
        tier: "Hot",
        replication: "LRS",
        plannedBlobs: "1",
      },
    });
  });

  it("keeps scan results usable when live pricing fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_service_plan.example",
              type: "azurerm_service_plan",
              values: {
                location: "ukwest",
                os_type: "Linux",
                sku_name: "P1v3",
                worker_count: 2,
                zone_balancing_enabled: true,
              },
            },
          ],
        },
      },
    });

    const result = await estimateTerraformPlanCosts(plan, { fetchImpl });

    expect(result.knownMonthlyCost).toBe(0);
    expect(result.unavailableResources).toBe(1);
    expect(result.resources[0].note).toContain("offline");
  });
});
