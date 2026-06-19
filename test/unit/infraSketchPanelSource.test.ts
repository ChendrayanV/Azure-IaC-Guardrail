import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panelSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchPanel.ts"),
  "utf8",
);
const catalogSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchCatalog.ts"),
  "utf8",
);
const workspaceSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchWorkspace.ts"),
  "utf8",
);
const webviewSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchWebview.ts"),
  "utf8",
);
const combinedSource = `${panelSource}\n${catalogSource}\n${workspaceSource}\n${webviewSource}`;

describe("Cloud Canvas webview source", () => {
  it("bundles Montserrat through the VS Code webview resource pipeline", () => {
    expect(panelSource).toContain("Montserrat-VariableFont_wght.ttf");
    expect(webviewSource).toContain('font-family: "Montserrat"');
    expect(webviewSource).toContain("font-src ${cspSource}");
  });

  it("renders packaged SVG icons in the palette and canvas", () => {
    expect(combinedSource).toContain("completeCatalog");
    expect(webviewSource).toContain("img-src ${cspSource}");
    expect(webviewSource).toContain('class="icon-image"');
    expect(webviewSource).toContain("iconMarkup(item");
    expect(webviewSource).toContain("iconMarkup(service");
    expect(webviewSource).toContain("Draft From Image");
  });

  it("starts Cloud Canvas blank without starter patterns or prior sketches", () => {
    expect(panelSource).toContain("const sketch: InfraSketch = {");
    expect(panelSource).toContain("nodes: []");
    expect(panelSource).toContain("connections: []");
    expect(webviewSource).toContain("Start with a blank canvas");
    expect(webviewSource).not.toContain("Start a blank canvas");
    expect(webviewSource).not.toContain("loadPattern(");
    expect(webviewSource).not.toContain("commonPattern(");
  });

  it("supports a dark view toggle in the canvas toolbar", () => {
    expect(webviewSource).toContain('id="themeToggle"');
    expect(webviewSource).toContain('body[data-theme="dark"]');
    expect(webviewSource).toContain("function applyTheme()");
    expect(webviewSource).toContain('themeToggle.textContent = isDarkTheme ? "Light view" : "Dark view"');
  });

  it("uses mapped parameters and opens the inspector after drop", () => {
    expect(combinedSource).toContain("mappedParameterDefinitions()");
    expect(webviewSource).toContain("definition.required");
    expect(webviewSource).toContain("definition.controlIds?.length ? definition.controlIds.join(', ') : ''");
    expect(webviewSource).toContain("renderServiceGuidance(node, service)");
    expect(webviewSource).toContain("Generated Terraform");
    expect(webviewSource).toContain("depends_on entries");
    expect(webviewSource).toContain("addDependencies(node, variant.requiredDependencies)");
    expect(webviewSource).toContain("applyImageDraft()");
    expect(webviewSource).toContain("selectedId = created.id");
  });

  it("cascades required dependencies for assisted canvas additions", () => {
    expect(webviewSource).toContain("ensureDependency(node, type, index, new Set())");
    expect(webviewSource).toContain("targetVariant.requiredDependencies.forEach");
    expect(webviewSource).toContain("ensureDependency(target, requiredType, requiredIndex, new Set(trail))");
    expect(webviewSource).toContain("creationSource: 'dependency'");
    expect(webviewSource).toContain("autoCreatedFor: node.serviceType");
    expect(webviewSource).toContain("Added from image draft");
  });

  it("explains preview and validation actions in the toolbar", () => {
    expect(webviewSource).toContain("Preview</strong> opens generated Terraform");
    expect(webviewSource).toContain(
      "Validate</strong> runs Terraform validation and the built-in static scan",
    );
  });

  it("does not report workspace profile JSON failures as service parameter JSON", () => {
    expect(panelSource).toContain('normalized.includes("profile.json")');
    expect(panelSource).toContain("Cloud Canvas could not ${action}: ${detail}");
    expect(panelSource).toContain("one of the selected service parameters contains invalid or incomplete JSON");
  });

  it("offers selectable arrow styles for connections", () => {
    expect(webviewSource).toContain('id="arrowStyle"');
    expect(webviewSource).toContain('<option value="animated-dotted">Running dotted</option>');
    expect(webviewSource).toContain("connection.style || 'solid'");
    expect(webviewSource).toContain("style: connectionStyle");
  });

  it("clears the complete canvas without a confirmation gate", () => {
    const clearHandler = webviewSource.match(
      /document\.getElementById\("clearCanvas"\)[\s\S]*?\n {4}\}\);/,
    )?.[0];

    expect(clearHandler).toBeDefined();
    expect(clearHandler).not.toContain("confirm(");
    expect(clearHandler).toContain("sketch.nodes = []");
    expect(clearHandler).toContain("sketch.connections = []");
    expect(clearHandler).toContain("selectedId = null");
    expect(clearHandler).toContain("sequence = 1");
    expect(clearHandler).toContain("remember()");
  });

  it("splits Cloud Canvas data and persistence helpers into dedicated modules", () => {
    expect(panelSource).toContain('./infraSketchWorkspace');
    expect(panelSource).toContain('./infraSketchWebview');
    expect(catalogSource).toContain("export function serviceCatalog");
    expect(catalogSource).toContain("export function mappedParameterDefinitions");
    expect(workspaceSource).toContain("export async function saveSketch");
    expect(webviewSource).toContain("export function renderSketchHtml");
    expect(webviewSource).toContain("function renderSketchStyles");
    expect(webviewSource).toContain("function renderSketchBody");
    expect(webviewSource).toContain("function renderSketchScriptBootstrap");
    expect(webviewSource).toContain("function renderSketchScriptPalette");
    expect(webviewSource).toContain("function renderSketchScriptInspector");
    expect(webviewSource).toContain("function renderSketchScriptParameters");
    expect(webviewSource).toContain("function renderSketchScriptDependencyFlow");
    expect(webviewSource).toContain("function renderSketchScriptEvents");
    expect(webviewSource).toContain("function renderSketchScriptState");
    expect(webviewSource).toContain("function renderSketchScriptExport");
    expect(webviewSource).toContain("export function createNonce");
  });
});
