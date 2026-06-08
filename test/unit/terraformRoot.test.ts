import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findTerraformRoot } from "../../src/terraform/terraformRoot";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("Terraform root discovery", () => {
  it("finds the root module from a nested variable file", async () => {
    const workspace = await createWorkspace();
    const root = path.join(workspace, "test", "fixtures", "production");
    const environment = path.join(root, "environments", "development");
    await fs.mkdir(environment, { recursive: true });
    await fs.writeFile(
      path.join(root, "versions.tf"),
      'terraform { required_version = ">= 1.0" }\n',
    );
    const varFile = path.join(environment, "terraform.tfvars");
    await fs.writeFile(varFile, 'environment = "development"\n');

    expect(await findTerraformRoot(workspace, varFile)).toBe(root);
  });

  it("walks past a child module to the root terraform block", async () => {
    const workspace = await createWorkspace();
    const root = path.join(workspace, "infrastructure");
    const moduleDirectory = path.join(root, "modules", "storage");
    await fs.mkdir(moduleDirectory, { recursive: true });
    await fs.writeFile(
      path.join(root, "versions.tf"),
      'terraform { required_version = ">= 1.0" }\n',
    );
    const moduleFile = path.join(moduleDirectory, "main.tf");
    await fs.writeFile(moduleFile, 'resource "example" "this" {}\n');

    expect(await findTerraformRoot(workspace, moduleFile)).toBe(root);
  });
});

async function createWorkspace(): Promise<string> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "azure-iac-guardrail-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}
