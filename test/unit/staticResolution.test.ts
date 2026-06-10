import { describe, expect, it } from "vitest";
import {
  createStaticResolutionContext,
  evaluateStaticExpression,
} from "../../src/core/staticResolution";
import { scanTerraformWithContext } from "../../src/core/scanner";
import type { Control } from "../../src/types";

describe("static Terraform resolution", () => {
  it("applies tfvars over variable defaults and resolves locals", () => {
    const context = createStaticResolutionContext(
      [
        {
          path: "variables.tf",
          content: `
variable "allow_public" {
  default = true
}
locals {
  effective_public = var.allow_public
  label = "public-\${var.allow_public}"
}`,
        },
      ],
      [{ path: "production.tfvars", content: "allow_public = false" }],
    );

    expect(context.variables.get("allow_public")).toMatchObject({
      value: false,
      source: "production.tfvars:1",
    });
    expect(context.locals.get("effective_public")?.value).toBe(false);
    expect(context.locals.get("label")?.value).toBe("public-false");
  });

  it("resolves collections and simple conditional expressions", () => {
    const context = createStaticResolutionContext([], [
      {
        path: "environment.tfvars",
        content: `
enabled = true
regions = ["uksouth", "ukwest"]
tags = {
  environment = "production"
  owner = "platform"
}`,
      },
    ]);

    expect(evaluateStaticExpression("var.enabled ? \"on\" : \"off\"", context))
      .toMatchObject({ resolved: true, value: "on" });
    expect(context.variables.get("regions")?.value).toEqual([
      "uksouth",
      "ukwest",
    ]);
    expect(context.variables.get("tags")?.value).toEqual({
      environment: "production",
      owner: "platform",
    });
  });

  it("uses resolved values and provenance in static control findings", () => {
    const control: Control = {
      id: "AZ-STOR-001",
      title: "Block public access",
      description: "Test control",
      severity: "error",
      resourceTypes: ["azurerm_storage_account"],
      attribute: "public_network_access_enabled",
      operator: "equals",
      expected: false,
    };
    const context = createStaticResolutionContext(
      [],
      [{ path: "production.tfvars", content: "public_access = false" }],
    );
    const findings = scanTerraformWithContext(
      `resource "azurerm_storage_account" "example" {
  public_network_access_enabled = var.public_access
}`,
      [control],
      context,
    );

    expect(findings[0]).toMatchObject({
      outcome: "compliant",
      actual: false,
      resolvedFrom: "production.tfvars:1",
    });
  });

  it("keeps provider and data-source expressions unresolved", () => {
    const context = createStaticResolutionContext([], []);
    expect(
      evaluateStaticExpression("data.azurerm_client_config.current.tenant_id", context),
    ).toEqual({
      resolved: false,
      value: "data.azurerm_client_config.current.tenant_id",
    });
  });

  it("loads tfvars JSON files", () => {
    const context = createStaticResolutionContext([], [
      {
        path: "production.auto.tfvars.json",
        content: '{"enabled":false,"regions":["uksouth","ukwest"]}',
      },
    ]);

    expect(context.variables.get("enabled")?.value).toBe(false);
    expect(context.variables.get("regions")?.value).toEqual([
      "uksouth",
      "ukwest",
    ]);
  });
});
