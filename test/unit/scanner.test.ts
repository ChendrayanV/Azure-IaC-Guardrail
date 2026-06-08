import { describe, expect, it } from "vitest";
import { scanResources, scanTerraform } from "../../src/core/scanner";
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

describe("scanTerraform", () => {
  it("reports a non-compliant resource", () => {
    const source = `
resource "azurerm_storage_account" "bad" {
  allow_nested_items_to_be_public = true
}
`;
    const findings = scanTerraform(source, [control]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("noncompliant");
    expect(findings[0].control.id).toBe("AZ-STOR-001");
    expect(findings[0].actual).toBe("true");
    expect(findings[0].expected).toBe(false);
  });

  it("accepts a compliant resource", () => {
    const source = `
resource "azurerm_storage_account" "good" {
  allow_nested_items_to_be_public = false
}
`;
    const findings = scanTerraform(source, [control]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("compliant");
  });

  it("reports a missing required attribute", () => {
    const source = `
resource "azurerm_storage_account" "missing" {
  name = "example"
}
`;
    expect(scanTerraform(source, [control])).toHaveLength(1);
  });

  it("marks variable expressions as requiring a plan", () => {
    const source = `
resource "azurerm_storage_account" "variable" {
  allow_nested_items_to_be_public = var.allow_public_access
}
`;
    const findings = scanTerraform(source, [control]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("unresolved");
    expect(findings[0].actual).toBe("var.allow_public_access");
  });

  it("supports required-attribute controls", () => {
    const existsControl: Control = {
      ...control,
      id: "AZ-STOR-002",
      attribute: "min_tls_version",
      operator: "exists",
      expected: undefined,
    };
    const source = `
resource "azurerm_storage_account" "example" {
  min_tls_version = "TLS1_2"
}
`;

    const findings = scanTerraform(source, [existsControl]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("compliant");
  });

  it("supports forbidden-value controls", () => {
    const notEqualsControl: Control = {
      ...control,
      id: "AZ-STOR-003",
      attribute: "account_tier",
      operator: "notEquals",
      expected: "Standard",
    };
    const source = `
resource "azurerm_storage_account" "example" {
  account_tier = "Standard"
}
`;

    const findings = scanTerraform(source, [notEqualsControl]);
    expect(findings).toHaveLength(1);
    expect(findings[0].actual).toBe("Standard");
  });

  it("supports linked-resource existence without a secondary condition", () => {
    const relatedControl: Control = {
      ...control,
      id: "AZ-STOR-004",
      attribute: "id",
      operator: "relatedResourceExists",
      expected: undefined,
      relatedResourceType: "azurerm_storage_account_customer_managed_key",
      relatedMatchAttribute: "storage_account_id",
    };
    const source = `
resource "azurerm_storage_account" "example" {
  id = "storage-1"
}

resource "azurerm_storage_account_customer_managed_key" "example" {
  storage_account_id = "storage-1"
}
`;

    const findings = scanTerraform(source, [relatedControl]);
    expect(findings).toHaveLength(1);
    expect(findings[0].outcome).toBe("compliant");
  });

  it("supports plan-only nested attributes and allowed values", () => {
    const nestedControl: Control = {
      ...control,
      id: "AZ-WEB-007",
      resourceTypes: ["azurerm_linux_web_app"],
      attribute: "site_config.minimum_tls_version",
      operator: "oneOf",
      expected: ["1.2", "1.3"],
      planOnly: true,
    };
    const staticFindings = scanTerraform(
      `resource "azurerm_linux_web_app" "example" { name = "example" }`,
      [nestedControl],
    );
    expect(staticFindings[0].outcome).toBe("unresolved");

    const plannedResource = {
      type: "azurerm_linux_web_app",
      name: "example",
      address: "azurerm_linux_web_app.example",
      startLine: 0,
      attributes: new Map([
        [
          "site_config",
          {
            name: "site_config",
            value: [{ minimum_tls_version: "1.3" }],
            resolved: true,
            line: 0,
            startCharacter: 0,
            endCharacter: 1,
          },
        ],
      ]),
    };
    const planFindings = scanResources([plannedResource], [nestedControl]);
    expect(planFindings[0].actual).toBe("1.3");
    expect(planFindings[0].outcome).toBe("compliant");
  });

  it("can omit plan-only organization controls from static scans", () => {
    const policyControl: Control = {
      ...control,
      id: "ORG-TAG-OWNER",
      attribute: "tags.owner",
      operator: "exists",
      planOnly: true,
      skipStatic: true,
    };
    const source = `resource "azurerm_storage_account" "example" {
      tags = local.tags
    }`;

    expect(scanTerraform(source, [policyControl])).toEqual([]);
  });

  it("preserves numeric-looking strings when the expected value is a string", () => {
    const tlsControl: Control = {
      ...control,
      id: "AZ-SQL-001",
      resourceTypes: ["azurerm_mssql_server"],
      attribute: "minimum_tls_version",
      expected: "1.2",
    };
    const source = `
resource "azurerm_mssql_server" "example" {
  minimum_tls_version = "1.2"
}
`;

    expect(scanTerraform(source, [tlsControl])[0].outcome).toBe(
      "compliant",
    );
  });

  it("supports collection membership controls", () => {
    const containsControl: Control = {
      ...control,
      id: "AZ-STOR-017",
      attribute: "network_rules.bypass",
      operator: "contains",
      expected: "AzureServices",
      planOnly: true,
    };
    const resource = {
      type: "azurerm_storage_account",
      name: "example",
      address: "azurerm_storage_account.example",
      startLine: 0,
      attributes: new Map([
        [
          "network_rules",
          {
            name: "network_rules",
            value: [{ bypass: ["Metrics", "AzureServices"] }],
            resolved: true,
            line: 0,
            startCharacter: 0,
            endCharacter: 1,
          },
        ],
      ]),
    };

    const findings = scanResources([resource], [containsControl]);
    expect(findings[0].outcome).toBe("compliant");
  });
});
