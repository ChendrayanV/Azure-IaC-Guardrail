import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import completeCatalog from "../../azure-complete-catalog-vscode.json";
import { normalizeWorkspacePolicy } from "../../src/controls/workspacePolicy";
import { scanResources } from "../../src/core/scanner";
import { loadStaticModuleWorkspace } from "../../src/core/staticModules";
import { parseTerraform } from "../../src/core/terraformParser";
import type { Control } from "../../src/types";

const fixtureRoot = path.resolve(
  __dirname,
  "../fixtures/three-tier-webapp",
);

describe("three-tier web app fixture", () => {
  it("is configured for an offline static scan", () => {
    const settings = JSON.parse(
      fs.readFileSync(
        path.join(fixtureRoot, ".vscode/settings.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(settings["azureIacGuardrail.scanOnSave"]).toBe(true);
    expect(settings["azureIacGuardrail.staticVarFiles"]).toEqual([
      "environments/dev.tfvars",
    ]);
    expect(settings["azureIacGuardrail.initializeBeforePlan"]).toBe(true);
    expect(fs.existsSync(path.join(fixtureRoot, "backend.tf"))).toBe(false);
    expect(fs.existsSync(path.join(fixtureRoot, "terraform.tfvars"))).toBe(
      false,
    );
  });

  it("resolves root and child-module values without a plan", async () => {
    const workspace = await loadStaticModuleWorkspace(fixtureRoot, [
      "environments/dev.tfvars",
    ]);
    const root = workspace.sources.find(
      (source) => source.displayPath === "locals.tf",
    );
    const webTier = workspace.sources.find(
      (source) =>
        source.moduleAddress === "module.web_tier" &&
        source.displayPath.endsWith("modules/web-tier/main.tf"),
    );

    expect(workspace.issues).toEqual([]);
    expect(root?.context.variables.get("environment")?.value).toBe("dev");
    expect(root?.context.locals.get("workload_name")?.value).toBe(
      "guardrail-dev",
    );
    expect(webTier?.context.variables.get("sku_name")?.value).toBe("B1");
  });

  it("contains a valid workspace policy", () => {
    const profile = normalizeWorkspacePolicy(
      JSON.parse(
        fs.readFileSync(
          path.join(
            fixtureRoot,
            ".azure-iac-guardrail/profile.json",
          ),
          "utf8",
        ),
      ),
    );

    expect(profile.terraformVersion).toBe(">= 1.9.0, < 2.0.0");
    expect(profile.allowedRegions).toEqual(["uksouth", "ukwest"]);
  });

  it("evaluates visible App Service nested settings without a plan", async () => {
    const workspace = await loadStaticModuleWorkspace(fixtureRoot, [
      "environments/dev.tfvars",
    ]);
    const resources = workspace.sources.flatMap((source) =>
      parseTerraform(source.content, source.context, {
        sourcePath: source.displayPath,
        moduleAddress: source.moduleAddress,
      }),
    );
    const controls = completeCatalog.services.web_app.controls as Control[];
    const findings = scanResources(resources, controls).filter(
      (finding) =>
        finding.resource.moduleAddress === "module.app_tier" &&
        ["AZ-WEB-002", "AZ-WEB-003", "AZ-WEB-005", "AZ-WEB-006", "AZ-WEB-007", "AZ-WEB-008", "AZ-WEB-009"]
          .includes(finding.control.id),
    );

    expect(findings).toHaveLength(7);
    expect(findings.every((finding) => finding.outcome === "compliant")).toBe(
      true,
    );
  });
});
