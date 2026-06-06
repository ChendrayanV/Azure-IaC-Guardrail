import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "../configuration";
import type { Control, ControlCatalog } from "../types";

export async function loadControls(
  context: vscode.ExtensionContext,
): Promise<Control[]> {
  const builtInDirectory = vscode.Uri.joinPath(
    context.extensionUri,
    "azure-infrastructure-standards",
    "controls",
  ).fsPath;
  const controls = await readCatalogDirectory(builtInDirectory);

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const configuredPath = configuredControlsPath(folder.uri);
    controls.push(
      ...(await readCatalogDirectory(
        path.join(folder.uri.fsPath, configuredPath),
      )),
    );

    if (configuredPath === ".azure-iac-guardrail/controls") {
      controls.push(
        ...(await readCatalogDirectory(
          path.join(folder.uri.fsPath, ".azure-code-guard/controls"),
        )),
      );
      controls.push(
        ...(await readCatalogDirectory(
          path.join(folder.uri.fsPath, ".infra-compliance/controls"),
        )),
      );
    }
  }

  return controls;
}

function configuredControlsPath(uri: vscode.Uri): string {
  return getConfigurationValue(
    uri,
    "workspaceControlsPath",
    ".azure-iac-guardrail/controls",
  ) as string;
}

async function readCatalogDirectory(directory: string): Promise<Control[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const catalogs = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => readCatalog(path.join(directory, entry.name))),
    );
    return catalogs.flatMap((catalog) => catalog.controls);
  } catch (error) {
    if (isMissingFile(error)) {
      return [];
    }
    throw error;
  }
}

async function readCatalog(filePath: string): Promise<ControlCatalog> {
  const content = await fs.readFile(filePath, "utf8");
  const catalog = JSON.parse(content) as Partial<ControlCatalog>;

  if (!catalog.catalogVersion || !Array.isArray(catalog.controls)) {
    throw new Error(`Invalid control catalog: ${filePath}`);
  }
  return catalog as ControlCatalog;
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
