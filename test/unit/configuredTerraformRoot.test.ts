import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  normalizeWorkspacePolicy,
  WORKSPACE_POLICY_PATH,
} from "../../src/controls/workspacePolicy";
import { loadStaticModuleWorkspace } from "../../src/core/staticModules";
import { resolveConfiguredTerraformRoot } from "../../src/terraform/terraformRoot";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("configured Terraform root", () => {
  it("restricts static module loading to the selected nested root", async () => {
    const workspace = await fs.mkdtemp(
      path.join(os.tmpdir(), "guardrail-configured-root-"),
    );
    temporaryDirectories.push(workspace);
    const selectedRoot = path.join(workspace, "infra", "application");
    await fs.mkdir(selectedRoot, { recursive: true });
    await fs.writeFile(
      path.join(workspace, "outside.tf"),
      'resource "azurerm_resource_group" "outside" {}\n',
    );
    await fs.writeFile(
      path.join(selectedRoot, "main.tf"),
      'resource "azurerm_resource_group" "inside" {}\n',
    );
    await fs.mkdir(
      path.join(workspace, path.dirname(WORKSPACE_POLICY_PATH)),
      { recursive: true },
    );
    const profile = normalizeWorkspacePolicy({
      terraformRoot: "infra/application",
    });
    await fs.writeFile(
      path.join(workspace, WORKSPACE_POLICY_PATH),
      JSON.stringify(profile),
    );

    const resolved = resolveConfiguredTerraformRoot(
      workspace,
      profile.terraformRoot,
    );
    const loaded = await loadStaticModuleWorkspace(resolved, []);

    expect(loaded.sources.map((source) => source.displayPath)).toEqual([
      "main.tf",
    ]);
  });
});
