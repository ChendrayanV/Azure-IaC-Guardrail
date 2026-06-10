import { describe, expect, it } from "vitest";
import {
  compareTerraformPlans,
  renderPlanComparisonMarkdown,
} from "../../src/core/planComparison";

describe("Terraform plan comparison", () => {
  it("reports added, removed, changed, and unchanged resources", () => {
    const baseline = plan([
      resource("azurerm_storage_account.keep", { name: "keep", tier: "Standard" }),
      resource("azurerm_storage_account.remove", { name: "remove" }),
      resource("azurerm_resource_group.same", { name: "same" }),
    ]);
    const candidate = plan([
      resource("azurerm_storage_account.keep", { name: "keep", tier: "Premium" }),
      resource("azurerm_storage_account.add", { name: "add" }),
      resource("azurerm_resource_group.same", { name: "same" }),
    ]);

    const comparison = compareTerraformPlans(baseline, candidate);
    expect(comparison).toEqual({
      added: ["azurerm_storage_account.add"],
      removed: ["azurerm_storage_account.remove"],
      changed: [
        {
          address: "azurerm_storage_account.keep",
          attributes: ["tier"],
        },
      ],
      unchanged: 1,
    });
    expect(
      renderPlanComparisonMarkdown(comparison, "before.tfplan", "after.tfplan"),
    ).toContain("Only changed attribute names are shown");
  });
});

function plan(resources: unknown[]): string {
  return JSON.stringify({
    planned_values: { root_module: { resources } },
  });
}

function resource(address: string, values: Record<string, unknown>) {
  return { address, mode: "managed", values };
}
