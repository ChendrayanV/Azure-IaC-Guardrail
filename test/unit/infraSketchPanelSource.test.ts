import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const panelSource = fs.readFileSync(
  path.join(process.cwd(), "src", "ui", "infraSketchPanel.ts"),
  "utf8",
);

describe("Cloud Canvas webview source", () => {
  it("bundles Montserrat through the VS Code webview resource pipeline", () => {
    expect(panelSource).toContain("Montserrat-VariableFont_wght.ttf");
    expect(panelSource).toContain('font-family: "Montserrat"');
    expect(panelSource).toContain("font-src ${cspSource}");
  });

  it("clears the complete canvas without a confirmation gate", () => {
    const clearHandler = panelSource.match(
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
});
