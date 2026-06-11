import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvedSourceFinding } from "../../src/editor/findingProvenance";
import type { Control, Finding } from "../../src/types";

const control: Control = {
  id: "AZ-WEB-004",
  title: "Web apps should disable public network access",
  description: "Test control",
  severity: "error",
  resourceTypes: ["azurerm_linux_web_app"],
  attribute: "public_network_access_enabled",
  operator: "equals",
  expected: false,
};

describe("resolved source diagnostics", () => {
  it("maps a resource failure to the exact tfvars assignment", () => {
    const workspace = path.resolve("test/fixtures/three-tier-webapp");
    const finding: Finding = {
      outcome: "noncompliant",
      control,
      resource: {
        type: "azurerm_linux_web_app",
        name: "this",
        sourceUri: "file:///modules/web-tier/main.tf",
        startLine: 3,
        attributes: new Map(),
      },
      actual: true,
      expected: false,
      resolvedFrom: "environments/dev.tfvars:7",
      line: 4,
      startCharacter: 2,
      endCharacter: 45,
      message: "test",
      fix: { kind: "replace-value", value: false },
    };

    const resolved = resolvedSourceFinding(workspace, finding);

    expect(resolved?.filePath).toBe(
      path.join(workspace, "environments/dev.tfvars"),
    );
    expect(resolved?.finding).toMatchObject({
      line: 6,
      fix: { kind: "replace-value", value: false },
    });
  });

  it("does not map pseudo module-input provenance", () => {
    const finding = {
      outcome: "noncompliant",
      control,
      resource: {
        type: "azurerm_linux_web_app",
        name: "this",
        startLine: 0,
        attributes: new Map(),
      },
      actual: true,
      expected: false,
      resolvedFrom: "main.tf:12 (module.web inputs)",
      line: 0,
      startCharacter: 0,
      endCharacter: 1,
      message: "test",
      fix: { kind: "replace-value", value: false },
    } satisfies Finding;

    expect(resolvedSourceFinding(process.cwd(), finding)).toBeUndefined();
  });
});
