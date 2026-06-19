import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createWorkspacePolicyControls,
  defaultWorkspacePolicy,
  loadWorkspacePolicy,
  normalizeWorkspacePolicy,
} from "../../src/controls/workspacePolicy";
import { scanTerraformPlan } from "../../src/core/planScanner";
import { scanTerraform } from "../../src/core/scanner";

describe("workspace policy", () => {
  it("provides the recommended Azure tag defaults", () => {
    expect(defaultWorkspacePolicy()).toEqual({
      version: 1,
      terraformRoot: ".",
      terraformVersion: ">= 1.5.0, < 2.0.0",
      allowedRegions: ["uksouth", "ukwest"],
      costAssumptions: {
        currency: "USD",
        monthlyStorageGb: 1,
        monthlyReadOperations: 100000,
        monthlyWriteOperations: 10000,
        monthlyEgressGb: 0,
      },
      requiredTags: [
        "environment",
        "cost-center",
        "owner",
        "deployed-via",
      ],
      tagValues: { "deployed-via": "terraform" },
      skippedControlIds: [],
      exceptions: [],
    });
  });

  it("normalizes duplicate tag entries", () => {
    const profile = normalizeWorkspacePolicy({
      requiredTags: ["owner", " owner ", ""],
      tagValues: { managed_by: " terraform " },
      skippedControlIds: ["az-ai-003", " AZ-AI-004 ", "az-ai-003"],
      exceptions: [
        {
          controlId: "az-stor-001",
          owner: "platform-team",
          justification: "Migration window",
          expiresOn: "2027-01-31",
          ticket: "SEC-42",
        },
      ],
    });

    expect(profile.requiredTags).toEqual(["owner"]);
    expect(profile.tagValues).toEqual({ managed_by: "terraform" });
    expect(profile).toEqual({
      version: 1,
      terraformRoot: ".",
      terraformVersion: ">= 1.5.0, < 2.0.0",
      allowedRegions: [],
      costAssumptions: {
        currency: "USD",
        monthlyStorageGb: 1,
        monthlyReadOperations: 100000,
        monthlyWriteOperations: 10000,
        monthlyEgressGb: 0,
      },
      requiredTags: ["owner"],
      tagValues: { managed_by: "terraform" },
      skippedControlIds: ["AZ-AI-003", "AZ-AI-004"],
      exceptions: [
        {
          controlId: "AZ-STOR-001",
          owner: "platform-team",
          justification: "Migration window",
          expiresOn: "2027-01-31",
          ticket: "SEC-42",
        },
      ],
    });
  });

  it("creates resolved-plan controls for required and fixed tags", () => {
    const profile = normalizeWorkspacePolicy({
      requiredTags: ["owner", "managed_by"],
      tagValues: { managed_by: "terraform" },
      skippedControlIds: [],
      exceptions: [],
    });
    const controls = createWorkspacePolicyControls(profile);

    expect(controls).toHaveLength(2);
    expect(controls.find((item) => item.attribute === "tags.owner")).toMatchObject({
      operator: "exists",
      planOnly: true,
      skipStatic: true,
      severity: "error",
    });
    expect(
      controls.find((item) => item.attribute === "tags.managed_by"),
    ).toMatchObject({
      operator: "equals",
      expected: "terraform",
    });
  });

  it("creates a hard-fail plan control for approved Azure regions", () => {
    const profile = normalizeWorkspacePolicy({
      allowedRegions: ["UK South", "ukwest", "uksouth"],
      requiredTags: [],
      tagValues: {},
      skippedControlIds: [],
      exceptions: [],
    });
    const control = createWorkspacePolicyControls(profile)[0];

    expect(profile.allowedRegions).toEqual(["uksouth", "ukwest"]);
    expect(control).toMatchObject({
      id: "ORG-REGION-LOCATION",
      attribute: "location",
      operator: "oneOf",
      expected: ["uksouth", "ukwest"],
      severity: "error",
      planOnly: true,
      skipStatic: true,
    });
  });

  it("treats a blank optional workspace profile as missing", async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "guardrail-profile-"),
    );
    await fs.mkdir(path.join(workspace, ".azure-iac-guardrail"));
    await fs.writeFile(
      path.join(workspace, ".azure-iac-guardrail", "profile.json"),
      "",
      "utf8",
    );

    await expect(loadWorkspacePolicy(workspace)).resolves.toBeUndefined();
  });

  it("reports malformed workspace profile JSON as a profile problem", async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "guardrail-profile-"),
    );
    await fs.mkdir(path.join(workspace, ".azure-iac-guardrail"));
    await fs.writeFile(
      path.join(workspace, ".azure-iac-guardrail", "profile.json"),
      "{",
      "utf8",
    );

    await expect(loadWorkspacePolicy(workspace)).rejects.toThrow(
      ".azure-iac-guardrail\\profile.json contains invalid JSON",
    );
  });

  it("defers approved regions to plan data and rejects an invalid location", () => {
    const profile = normalizeWorkspacePolicy({
      allowedRegions: ["uksouth", "ukwest"],
      requiredTags: [],
      tagValues: {},
      skippedControlIds: [],
      exceptions: [],
    });
    const control = createWorkspacePolicyControls(profile).find(
      (candidate) => candidate.id === "ORG-REGION-LOCATION",
    );
    expect(control).toBeDefined();

    expect(
      scanTerraform(
        `resource "azurerm_storage_account" "example" {
  location = azurerm_resource_group.example.location
}`,
        [control!],
      ),
    ).toEqual([]);

    const findings = scanTerraformPlan(
      JSON.stringify({
        planned_values: {
          root_module: {
            resources: [
              {
                address: "azurerm_storage_account.example",
                mode: "managed",
                type: "azurerm_storage_account",
                name: "example",
                values: { location: "swedencentral" },
              },
            ],
          },
        },
      }),
      [control!],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      outcome: "noncompliant",
      actual: "swedencentral",
      expected: ["uksouth", "ukwest"],
    });
  });

  it("rejects non-canonical Azure regions", () => {
    expect(() =>
      normalizeWorkspacePolicy({
        allowedRegions: ["london"],
        requiredTags: [],
        tagValues: {},
        skippedControlIds: [],
        exceptions: [],
      }),
    ).toThrow("uksouth");
  });

  it("rejects malformed skipped control IDs", () => {
    expect(() =>
      normalizeWorkspacePolicy({
        requiredTags: [],
        tagValues: {},
        skippedControlIds: ["not a control"],
        exceptions: [],
      }),
    ).toThrow("AZ-AI-003");
  });

  it("normalizes monthly cost assumptions", () => {
    const profile = normalizeWorkspacePolicy({
      allowedRegions: [],
      costAssumptions: {
        currency: "gbp",
        monthlyStorageGb: "25",
        monthlyReadOperations: 500000,
        monthlyWriteOperations: 25000,
        monthlyEgressGb: 10,
      },
      requiredTags: [],
      tagValues: {},
      skippedControlIds: [],
      exceptions: [],
    });

    expect(profile.costAssumptions).toEqual({
      currency: "GBP",
      monthlyStorageGb: 25,
      monthlyReadOperations: 500000,
      monthlyWriteOperations: 25000,
      monthlyEgressGb: 10,
    });
  });

  it("normalizes a selected Terraform version constraint", () => {
    expect(
      normalizeWorkspacePolicy({
        terraformVersion: " >= 1.8.0,   < 2.0.0 ",
      }).terraformVersion,
    ).toBe(">= 1.8.0, < 2.0.0");
  });

  it("rejects invalid Terraform version constraints", () => {
    expect(() =>
      normalizeWorkspacePolicy({ terraformVersion: "latest" }),
    ).toThrow("Terraform version");
  });

  it("normalizes a workspace-relative Terraform root", () => {
    expect(
      normalizeWorkspacePolicy({
        terraformRoot: "./infrastructure/platform/",
      }).terraformRoot,
    ).toBe("infrastructure/platform");
  });

  it("rejects Terraform roots outside the workspace", () => {
    expect(() =>
      normalizeWorkspacePolicy({ terraformRoot: "../shared" }),
    ).toThrow("workspace-relative");
    expect(() =>
      normalizeWorkspacePolicy({ terraformRoot: "C:\\external" }),
    ).toThrow("workspace-relative");
  });
});
