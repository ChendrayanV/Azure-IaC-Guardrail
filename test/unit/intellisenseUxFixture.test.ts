import * as path from "node:path";
import { describe, expect, it } from "vitest";
import completeCatalog from "../../azure-complete-catalog-vscode.json";
import { scanResources } from "../../src/core/scanner";
import { loadStaticModuleWorkspace } from "../../src/core/staticModules";
import { parseTerraform } from "../../src/core/terraformParser";
import { resolvedSourceFinding } from "../../src/editor/findingProvenance";
import type { Control } from "../../src/types";

const fixtureRoot = path.resolve(
  __dirname,
  "../fixtures/intellisense-ux-demo",
);

describe("IntelliSense UX fixture", () => {
  it("produces direct, nested, missing, and tfvars-fixable findings", async () => {
    const workspace = await loadStaticModuleWorkspace(fixtureRoot, [
      "dev.tfvars",
    ]);
    const resources = workspace.sources.flatMap((source) =>
      parseTerraform(source.content, source.context, {
        sourcePath: source.displayPath,
      }),
    );
    const controls = completeCatalog.services.web_app.controls as Control[];
    const findings = scanResources(resources, controls);

    expect(findings.find((finding) => finding.control.id === "AZ-WEB-002"))
      .toMatchObject({
        outcome: "noncompliant",
        fix: {
          kind: "insert-attribute",
          attribute: "ftp_publish_basic_authentication_enabled",
          value: false,
        },
      });
    expect(findings.find((finding) => finding.control.id === "AZ-WEB-007"))
      .toMatchObject({
        outcome: "noncompliant",
        actual: "1.0",
        fix: { kind: "replace-value", value: "1.2" },
      });

    const publicAccess = findings.find(
      (finding) => finding.control.id === "AZ-WEB-004",
    );
    const remoteDebugging = findings.find(
      (finding) => finding.control.id === "AZ-WEB-006",
    );
    expect(publicAccess?.resolvedFrom).toBe("dev.tfvars:3");
    expect(remoteDebugging?.resolvedFrom).toBe("dev.tfvars:4");
    expect(resolvedSourceFinding(fixtureRoot, publicAccess!)).toMatchObject({
      filePath: path.join(fixtureRoot, "dev.tfvars"),
      finding: {
        line: 2,
        fix: { kind: "replace-value", value: false },
      },
    });
  });
});
