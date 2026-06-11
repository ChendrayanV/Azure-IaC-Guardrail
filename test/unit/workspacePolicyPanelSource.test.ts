import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(__dirname, "../../src/ui/workspacePolicyPanel.ts"),
  "utf8",
);

describe("Azure Pre-configuration Terraform root UI", () => {
  it("provides folder selection, path entry, preview, and reset", () => {
    expect(source).toContain("Terraform workspace root");
    expect(source).toContain('id="terraformRoot"');
    expect(source).toContain('id="browseTerraformRoot"');
    expect(source).toContain('id="resetTerraformRoot"');
    expect(source).toContain('id="terraformRootPreview"');
    expect(source).toContain('type: "selectTerraformRoot"');
    expect(source).toContain('type: "terraformRootSelected"');
  });

  it("persists and validates the selected root", () => {
    expect(source).toContain("terraformRoot: terraformRootValue");
    expect(source).toContain("resolveConfiguredTerraformRoot");
    expect(source).toContain(
      "The selected Terraform root does not contain any .tf files.",
    );
  });
});
