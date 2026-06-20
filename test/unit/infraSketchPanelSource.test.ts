import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panelSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchPanel.ts"),
  "utf8",
);
const webviewSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchWebview.ts"),
  "utf8",
);
const configArchitectureSource = fs.readFileSync(
  path.join(process.cwd(), "src", "core", "configArchitecture.ts"),
  "utf8",
);
const combinedSource = `${panelSource}\n${webviewSource}\n${configArchitectureSource}`;

describe("Cloud Canvas generated architecture source", () => {
  it("generates diagrams from Terraform configuration and local plan files", () => {
    expect(panelSource).toContain("generateFromConfiguration");
    expect(panelSource).toContain("generateFromPlan");
    expect(panelSource).toContain("loadStaticWorkspace");
    expect(panelSource).toContain("parseTerraform");
    expect(panelSource).toContain("analyzeTerraformConfiguration");
    expect(panelSource).toContain("analyzeTerraformPlan");
    expect(panelSource).toContain("showTerraformPlan");
  });

  it("removes manual canvas authoring controls", () => {
    expect(webviewSource).not.toContain("service-list");
    expect(webviewSource).not.toContain("draggable");
    expect(webviewSource).not.toContain("dragstart");
    expect(webviewSource).not.toContain("Undo");
    expect(webviewSource).not.toContain("Redo");
    expect(webviewSource).not.toContain("Zoom -");
    expect(webviewSource).not.toContain("Zoom +");
    expect(webviewSource).not.toContain("Two-way arrows");
    expect(webviewSource).not.toContain("Arrow style");
    expect(webviewSource).not.toContain("Dark view");
    expect(webviewSource).not.toContain("Clear canvas");
  });

  it("keeps removed Cloud Canvas actions unavailable", () => {
    expect(combinedSource).not.toContain("Draft From Image");
    expect(combinedSource).not.toContain("Preview Terraform");
    expect(combinedSource).not.toContain("Validate + Static Scan");
    expect(combinedSource).not.toContain("Generate Terraform");
    expect(combinedSource).not.toContain("generateDraftFromImage");
    expect(combinedSource).not.toContain("previewTerraform");
    expect(combinedSource).not.toContain("validateTerraform");
    expect(combinedSource).not.toContain("generateTerraform");
  });

  it("renders a professional architecture viewer", () => {
    expect(webviewSource).toContain("Generate From Terraform");
    expect(webviewSource).toContain("Generate From Plan File");
    expect(webviewSource).toContain("Azure architecture diagram");
    expect(webviewSource).toContain("Export SVG");
    expect(webviewSource).toContain("Architecture overview");
    expect(webviewSource).toContain("public exposure signals");
  });

  it("infers configuration relationships and exposure signals", () => {
    expect(configArchitectureSource).toContain("collectReferenceEdges");
    expect(configArchitectureSource).toContain("referenceAddresses");
    expect(configArchitectureSource).toContain("hasPublicExposure");
    expect(configArchitectureSource).toContain("azurerm_public_ip");
  });
});
