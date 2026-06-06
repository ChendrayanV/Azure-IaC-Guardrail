import { describe, expect, it } from "vitest";
import { scanTerraform } from "../../src/core/scanner";
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
});
