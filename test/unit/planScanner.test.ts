import { describe, expect, it } from "vitest";
import { scanTerraformPlan } from "../../src/core/planScanner";
import type { Control } from "../../src/types";

const control: Control = {
  id: "AZ-STOR-001",
  title: "Block public access",
  description: "Test control",
  severity: "error",
  resourceTypes: ["azurerm_storage_account"],
  attribute: "allow_nested_items_to_be_public",
  operator: "equals",
  expected: false,
};

describe("scanTerraformPlan", () => {
  it("scans resolved values in root and child modules", () => {
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_storage_account.good",
              mode: "managed",
              type: "azurerm_storage_account",
              name: "good",
              values: { allow_nested_items_to_be_public: false },
            },
          ],
          child_modules: [
            {
              resources: [
                {
                  address:
                    "module.storage.azurerm_storage_account.noncompliant",
                  mode: "managed",
                  type: "azurerm_storage_account",
                  name: "noncompliant",
                  values: { allow_nested_items_to_be_public: true },
                },
              ],
            },
          ],
        },
      },
    });

    const findings = scanTerraformPlan(plan, [control]);
    expect(findings).toHaveLength(2);
    const noncompliant = findings.find(
      (finding) => finding.outcome === "noncompliant",
    );
    expect(noncompliant?.resource.address).toBe(
      "module.storage.azurerm_storage_account.noncompliant",
    );
    expect(noncompliant?.actual).toBe(true);
    expect(noncompliant?.expected).toBe(false);
    expect(
      findings.find((finding) => finding.outcome === "compliant"),
    ).toBeDefined();
  });

  it("ignores data sources", () => {
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "data.azurerm_storage_account.example",
              mode: "data",
              type: "azurerm_storage_account",
              name: "example",
              values: { allow_nested_items_to_be_public: true },
            },
          ],
        },
      },
    });

    expect(scanTerraformPlan(plan, [control])).toEqual([]);
  });

  it("rejects JSON that is not a Terraform plan", () => {
    expect(() => scanTerraformPlan("{}", [control])).toThrow(
      "planned_values.root_module",
    );
  });

  it("matches required private endpoints to the storage account", () => {
    const privateEndpointControl: Control = {
      ...control,
      id: "AZ-STOR-003",
      attribute: "id",
      operator: "relatedResourceExists",
      expected: "blob",
      relatedResourceType: "azurerm_private_endpoint",
      relatedMatchAttribute:
        "private_service_connection.*.private_connection_resource_id",
      relatedConditionAttribute:
        "private_service_connection.*.subresource_names",
    };
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              address: "azurerm_storage_account.example",
              mode: "managed",
              type: "azurerm_storage_account",
              name: "example",
              values: { id: "/storage/example" },
            },
            {
              address: "azurerm_private_endpoint.blob",
              mode: "managed",
              type: "azurerm_private_endpoint",
              name: "blob",
              values: {
                private_service_connection: [
                  {
                    private_connection_resource_id: "/storage/example",
                    subresource_names: ["blob"],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const findings = scanTerraformPlan(plan, [privateEndpointControl]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("compliant");
  });

  it("reports a private endpoint connected to another account", () => {
    const privateEndpointControl: Control = {
      ...control,
      id: "AZ-STOR-006",
      attribute: "id",
      operator: "relatedResourceExists",
      expected: "queue",
      relatedResourceType: "azurerm_private_endpoint",
      relatedMatchAttribute:
        "private_service_connection.*.private_connection_resource_id",
      relatedConditionAttribute:
        "private_service_connection.*.subresource_names",
    };
    const plan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              mode: "managed",
              type: "azurerm_storage_account",
              name: "example",
              values: { id: "/storage/example" },
            },
            {
              mode: "managed",
              type: "azurerm_private_endpoint",
              name: "queue",
              values: {
                private_service_connection: [
                  {
                    private_connection_resource_id: "/storage/other",
                    subresource_names: ["queue"],
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const findings = scanTerraformPlan(plan, [privateEndpointControl]);
    expect(findings).toHaveLength(1);
    expect(findings[0].control.id).toBe("AZ-STOR-006");
  });

  it("applies the CMK recommendation only to production sensitive data", () => {
    const cmkControl: Control = {
      ...control,
      id: "AZ-STOR-011",
      severity: "warning",
      attribute: "customer_managed_key",
      operator: "exists",
      conditions: [
        {
          attribute: "tags.environment",
          operator: "equals",
          expected: "production",
        },
        {
          attribute: "tags.data_classification",
          operator: "equals",
          expected: "sensitive",
        },
      ],
    };
    const productionPlan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              mode: "managed",
              type: "azurerm_storage_account",
              name: "production",
              values: {
                tags: {
                  environment: "production",
                  data_classification: "sensitive",
                },
                customer_managed_key: [],
              },
            },
          ],
        },
      },
    });
    const testPlan = JSON.stringify({
      planned_values: {
        root_module: {
          resources: [
            {
              mode: "managed",
              type: "azurerm_storage_account",
              name: "test",
              values: {
                tags: {
                  environment: "test",
                  data_classification: "sensitive",
                },
                customer_managed_key: [],
              },
            },
          ],
        },
      },
    });

    expect(scanTerraformPlan(productionPlan, [cmkControl])).toHaveLength(1);
    expect(scanTerraformPlan(testPlan, [cmkControl])).toEqual([]);
  });
});
