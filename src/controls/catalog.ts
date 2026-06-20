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
  const catalog = await loadCompleteCatalog(context);
  const controls = [...catalog.controls];
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

export async function loadCompleteCatalog(
  context: vscode.ExtensionContext,
): Promise<ControlCatalog> {
  const builtInCatalog = vscode.Uri.joinPath(
    context.extensionUri,
    "azure-complete-catalog-vscode.json",
  ).fsPath;
  const source = configuredCatalogSource();

  if (source === "workspace") {
    const workspaceCatalog = await readWorkspaceCompleteCatalog();
    if (workspaceCatalog) {
      return workspaceCatalog;
    }
    return readCompleteCatalog(builtInCatalog);
  }

  if (source === "remote") {
    const remoteCatalog = await readRemoteCompleteCatalog();
    if (remoteCatalog) {
      return remoteCatalog;
    }
    return readCompleteCatalog(builtInCatalog);
  }

  return readCompleteCatalog(builtInCatalog);
}

async function readCompleteCatalog(filePath: string): Promise<ControlCatalog> {
  const catalog = parseCompleteCatalog(
    await fs.readFile(filePath, "utf8"),
    filePath,
  );
  assertPinnedCatalogVersion(catalog, filePath);
  return catalog;
}

function parseCompleteCatalog(
  content: string,
  source: string,
): ControlCatalog {
  const catalog = JSON.parse(content) as Partial<ControlCatalog>;
  if (!catalog.catalogVersion || !Array.isArray(catalog.controls)) {
    throw new Error(`Invalid complete service catalog: ${source}`);
  }
  return catalog as ControlCatalog;
}

async function readWorkspaceCompleteCatalog(): Promise<
  ControlCatalog | undefined
> {
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const configuredPath = configuredCatalogPath(folder.uri);
    const catalogPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(folder.uri.fsPath, configuredPath);
    const catalog = await tryReadCompleteCatalog(catalogPath);
    if (catalog) {
      return catalog;
    }
  }
  return undefined;
}

async function readRemoteCompleteCatalog(): Promise<
  ControlCatalog | undefined
> {
  const url = configuredCatalogUrl();
  if (!url) {
    return undefined;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Unable to load remote catalog ${url}: HTTP ${response.status}`,
    );
  }
  const catalog = parseCompleteCatalog(await response.text(), url);
  assertPinnedCatalogVersion(catalog, url);
  return catalog;
}

async function tryReadCompleteCatalog(
  filePath: string,
): Promise<ControlCatalog | undefined> {
  try {
    return await readCompleteCatalog(filePath);
  } catch (error) {
    if (isMissingFile(error)) {
      return undefined;
    }
    throw error;
  }
}

function assertPinnedCatalogVersion(
  catalog: ControlCatalog,
  source: string,
): void {
  const pinnedVersion = configuredCatalogVersion();
  if (pinnedVersion && catalog.catalogVersion !== pinnedVersion) {
    throw new Error(
      `Catalog ${source} version ${catalog.catalogVersion} does not match pinned version ${pinnedVersion}.`,
    );
  }
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

function configuredCatalogSource(): "bundled" | "workspace" | "remote" {
  const value = vscode.workspace
    .getConfiguration("azureIacGuardrail")
    .get<string>("catalogSource", "bundled");
  return value === "workspace" || value === "remote" ? value : "bundled";
}

function configuredCatalogPath(uri: vscode.Uri): string {
  return getConfigurationValue(
    uri,
    "catalogPath",
    ".azure-iac-guardrail/catalog/azure-complete-catalog-vscode.json",
  ) as string;
}

function configuredCatalogUrl(): string | undefined {
  const value = vscode.workspace
    .getConfiguration("azureIacGuardrail")
    .get<string>("catalogUrl", "")
    .trim();
  return value || undefined;
}

function configuredCatalogVersion(): string | undefined {
  const value = vscode.workspace
    .getConfiguration("azureIacGuardrail")
    .get<string>("catalogVersion", "")
    .trim();
  return value || undefined;
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
