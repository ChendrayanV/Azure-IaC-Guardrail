import * as path from "node:path";
import { describe, expect, it } from "vitest";
import completeCatalog from "../../azure-complete-catalog-vscode.json";
import { scanResources } from "../../src/core/scanner";
import { loadStaticModuleWorkspace } from "../../src/core/staticModules";
import { parseTerraform } from "../../src/core/terraformParser";
import type { Control } from "../../src/types";

const fixtureRoot = path.resolve(
  __dirname,
  "../fixtures/remote-module-static-scan",
);

describe("downloaded remote module fixture", () => {
  it("indexes the cached registry module and propagates root inputs", async () => {
    const workspace = await loadStaticModuleWorkspace(fixtureRoot, [
      "dev.tfvars",
    ]);
    const remoteMain = workspace.sources.find(
      (source) =>
        source.moduleAddress === "module.network" &&
        source.displayPath.endsWith(
          ".terraform/modules/network/main.tf",
        ),
    );

    expect(workspace.issues).toEqual([]);
    expect(remoteMain).toBeDefined();
    expect(remoteMain?.context.variables.get("vnet_location")?.value).toBe(
      "uksouth",
    );
    expect(remoteMain?.context.variables.get("vnet_name")?.value).toBe(
      "vnet-remote-module-scan-dev",
    );
  });

  it("scans resources inside .terraform and offers a subnet fix", async () => {
    const workspace = await loadStaticModuleWorkspace(fixtureRoot, [
      "dev.tfvars",
    ]);
    const resources = workspace.sources.flatMap((source) =>
      parseTerraform(source.content, source.context, {
        sourcePath: source.displayPath,
        moduleAddress: source.moduleAddress,
      }),
    );
    const controls = completeCatalog.services.subnet.controls as Control[];
    const findings = scanResources(resources, controls).filter(
      (finding) =>
        finding.resource.moduleAddress === "module.network" &&
        finding.control.id === "AZ-NET-001",
    );

    expect(findings).toHaveLength(2);
    expect(findings.every(
      (finding) => finding.resource.sourcePath?.includes(".terraform/modules"),
    )).toBe(true);
    expect(findings.every(
      (finding) =>
        finding.outcome === "noncompliant" &&
        finding.fix?.kind === "insert-attribute" &&
        finding.fix.value === false,
    )).toBe(true);
  });
});
