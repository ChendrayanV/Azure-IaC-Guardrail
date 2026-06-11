import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  loadStaticModuleWorkspace,
  parseModuleCalls,
} from "../../src/core/staticModules";
import { parseTerraform } from "../../src/core/terraformParser";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("static Terraform modules", () => {
  it("indexes local modules with evaluated input values", async () => {
    const root = await fixture();
    await write(
      root,
      "main.tf",
      `module "storage" {
  source = "./modules/storage"
  public_access = var.public_access
  tags = {
    environment = var.environment
  }
}`,
    );
    await write(
      root,
      "variables.tf",
      `variable "public_access" { default = true }
variable "environment" { default = "default" }`,
    );
    await write(
      root,
      "modules/storage/main.tf",
      `resource "azurerm_storage_account" "this" {
  public_network_access_enabled = var.public_access
  tags = var.tags
}`,
    );
    await write(
      root,
      "modules/storage/variables.tf",
      `variable "public_access" { type = bool }
variable "tags" { type = map(string) }`,
    );
    await write(
      root,
      "dev.tfvars",
      `public_access = false
environment = "dev"`,
    );

    const workspace = await loadStaticModuleWorkspace(root, ["dev.tfvars"]);
    const child = workspace.sources.find(
      (source) => source.moduleAddress === "module.storage",
    );

    expect(workspace.issues).toEqual([]);
    expect(child?.context.variables.get("public_access")?.value).toBe(false);
    expect(child?.context.variables.get("tags")?.value).toEqual({
      environment: "dev",
    });
    const resource = parseTerraform(
      child?.content ?? "",
      child?.context,
    )[0];
    expect(resource.attributes.get("public_network_access_enabled")?.value)
      .toBe(false);
  });

  it("reports remote modules until Terraform has initialized them", async () => {
    const root = await fixture();
    await write(
      root,
      "main.tf",
      `module "network" {
  source  = "Azure/network/azurerm"
  version = "5.0.0"
}`,
    );

    const workspace = await loadStaticModuleWorkspace(root, []);

    expect(workspace.issues).toMatchObject([
      {
        moduleAddress: "module.network",
        source: "Azure/network/azurerm",
        reason: "not-installed",
      },
    ]);
  });

  it("indexes initialized registry or Git modules from the manifest", async () => {
    const root = await fixture();
    await write(
      root,
      "main.tf",
      `module "network" {
  source = "Azure/network/azurerm"
  location = "uksouth"
}`,
    );
    await write(
      root,
      ".terraform/modules/modules.json",
      JSON.stringify({
        Modules: [
          {
            Key: "network",
            Source: "registry.terraform.io/Azure/network/azurerm",
            Dir: ".terraform/modules/network",
          },
        ],
      }),
    );
    await write(
      root,
      ".terraform/modules/network/main.tf",
      `resource "azurerm_virtual_network" "this" {
  location = var.location
}`,
    );
    await write(
      root,
      ".terraform/modules/network/variables.tf",
      `variable "location" { type = string }`,
    );

    const workspace = await loadStaticModuleWorkspace(root, []);
    const child = workspace.sources.find(
      (source) => source.moduleAddress === "module.network",
    );

    expect(workspace.issues).toEqual([]);
    expect(child?.displayPath).toContain(".terraform/modules/network/");
    expect(child?.context.variables.get("location")?.value).toBe("uksouth");
  });

  it("reports dynamic and missing local module sources", async () => {
    const root = await fixture();
    await write(
      root,
      "main.tf",
      `module "dynamic" {
  source = var.module_source
}
module "missing" {
  source = "./modules/missing"
}`,
    );

    const workspace = await loadStaticModuleWorkspace(root, []);

    expect(workspace.issues.map((issue) => issue.reason).sort()).toEqual([
      "dynamic-source",
      "missing-local-source",
    ]);
  });

  it("flags count and for_each while still indexing module source", async () => {
    const root = await fixture();
    await write(
      root,
      "main.tf",
      `module "storage" {
  source   = "./modules/storage"
  for_each = toset(["one", "two"])
}`,
    );
    await write(
      root,
      "modules/storage/main.tf",
      `resource "azurerm_storage_account" "this" {
  name = "example"
}`,
    );

    const workspace = await loadStaticModuleWorkspace(root, []);

    expect(workspace.sources.some(
      (source) => source.moduleAddress === "module.storage",
    )).toBe(true);
    expect(workspace.issues).toMatchObject([
      {
        moduleAddress: "module.storage",
        reason: "multiple-instances",
      },
    ]);
  });

  it("parses multiline module input collections", () => {
    const calls = parseModuleCalls(`module "example" {
  source = "./example"
  tags = {
    environment = "dev"
    owner = "platform"
  }
}`);

    expect(calls[0].inputs.get("tags")).toContain('environment = "dev"');
  });
});

async function fixture(): Promise<string> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "guardrail-static-modules-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}

async function write(
  root: string,
  relativePath: string,
  content: string,
): Promise<void> {
  const filePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}
