import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "../configuration";
import type { Control, ControlCatalog } from "../types";
import {
  createWorkspacePolicyControls,
  loadWorkspacePolicy,
} from "./workspacePolicy";

export async function loadControls(
  context: vscode.ExtensionContext,
): Promise<Control[]> {
  const builtInCatalog = vscode.Uri.joinPath(
    context.extensionUri,
    "azure-complete-catalog-vscode.json",
  ).fsPath;
  const controls = await readCompleteCatalog(builtInCatalog);
  const skippedControlIds = new Set<string>();

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

    const policy = await loadWorkspacePolicy(folder.uri.fsPath);
    if (policy) {
      policy.skippedControlIds.forEach((id) =>
        skippedControlIds.add(id),
      );
      policy.exceptions
        .filter((exception) => !isExpired(exception.expiresOn))
        .forEach((exception) =>
          skippedControlIds.add(exception.controlId),
        );
      controls.push(...createWorkspacePolicyControls(policy));
    }
  }

  const uniqueControls = new Map(
    controls.map((control) => [control.id, control]),
  );
  return [...uniqueControls.values()].filter(
    (control) => !skippedControlIds.has(control.id.toUpperCase()),
  );
}

async function readCompleteCatalog(filePath: string): Promise<Control[]> {
  const content = await fs.readFile(filePath, "utf8");
  const catalog = JSON.parse(content) as {
    catalogVersion?: string;
    controls?: Control[];
  };
  if (!catalog.catalogVersion || !Array.isArray(catalog.controls)) {
    throw new Error(`Invalid complete service catalog: ${filePath}`);
  }
  return catalog.controls;
}

function isExpired(expiresOn: string): boolean {
  const endOfDay = new Date(`${expiresOn}T23:59:59.999Z`);
  return Number.isNaN(endOfDay.getTime()) || endOfDay < new Date();
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
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith(".json") &&
            entry.name !== "profile.json",
        )
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
