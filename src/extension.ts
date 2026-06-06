import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "./configuration";
import { loadControls } from "./controls/catalog";
import { scanTerraformPlan } from "./core/planScanner";
import type { FileScanResult } from "./core/resultsHtml";
import { scanTerraform } from "./core/scanner";
import {
  createTerraformPlanJson,
  initializeBeforePlanFor,
  initializeTerraform,
  showTerraformPlan,
  terraformPathFor,
} from "./terraform/terraformCli";
import { ResultsPanel } from "./ui/resultsPanel";

const COMMANDS = {
  scanWorkspace: "infraCompliance.scanWorkspace",
  scanPlan: "infraCompliance.scanPlan",
  createAndScanPlan: "infraCompliance.createAndScanPlan",
} as const;

export function activate(context: vscode.ExtensionContext): void {
  const resultsPanel = new ResultsPanel();
  context.subscriptions.push(
    resultsPanel,
    vscode.commands.registerCommand(COMMANDS.scanWorkspace, () =>
      scanWorkspace(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.scanPlan, () =>
      scanExistingPlan(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.createAndScanPlan, () =>
      createAndScanPlan(context, resultsPanel),
    ),
    vscode.workspace.onDidSaveTextDocument((document) =>
      handleSavedDocument(document, context, resultsPanel),
    ),
  );
}

export function deactivate(): void {}

async function scanWorkspace(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
): Promise<void> {
  resultsPanel.showLoading();
  try {
    const [files, controls] = await Promise.all([
      vscode.workspace.findFiles(
        "**/*.tf",
        "**/{.terraform,node_modules}/**",
      ),
      loadControls(context),
    ]);
    const results = await Promise.all(
      files.map(async (file): Promise<FileScanResult> => {
        const bytes = await vscode.workspace.fs.readFile(file);
        return {
          scanKind: "static",
          filePath: vscode.workspace.asRelativePath(file, false),
          uri: file.toString(),
          findings: scanTerraform(
            new TextDecoder("utf-8").decode(bytes),
            controls,
          ),
        };
      }),
    );
    resultsPanel.show(results);
  } catch (error) {
    showScanError(resultsPanel, error);
  }
}

async function scanExistingPlan(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
): Promise<void> {
  const workspaceFolder = await selectWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: false,
    defaultUri: workspaceFolder.uri,
    filters: {
      "Terraform plans": ["tfplan", "json"],
      "All files": ["*"],
    },
    openLabel: "Scan Terraform Plan",
    title: "Select a Terraform plan or plan JSON",
  });
  const planUri = selected?.[0];
  if (!planUri) {
    return;
  }

  resultsPanel.showLoading();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Scanning resolved Terraform plan",
    },
    async () => {
      try {
        const planJson = planUri.fsPath.endsWith(".json")
          ? await fs.readFile(planUri.fsPath, "utf8")
          : await showTerraformPlan(
              terraformPathFor(workspaceFolder.uri),
              planUri.fsPath,
              workspaceFolder.uri.fsPath,
            );
        const controls = await loadControls(context);
        resultsPanel.show([
          {
            scanKind: "plan",
            filePath: vscode.workspace.asRelativePath(planUri, false),
            findings: scanTerraformPlan(planJson, controls),
          },
        ]);
      } catch (error) {
        showScanError(resultsPanel, error);
      }
    },
  );
}

async function createAndScanPlan(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
): Promise<void> {
  const workspaceFolder = await selectWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }
  const varFile = await selectVariableFile(workspaceFolder.uri);
  if (varFile === null) {
    return;
  }

  resultsPanel.showLoading();
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Azure compliance",
    },
    async (progress) => {
      try {
        const terraformPath = terraformPathFor(workspaceFolder.uri);
        if (initializeBeforePlanFor(workspaceFolder.uri)) {
          progress.report({ message: "Initializing Terraform..." });
          await initializeTerraform(
            terraformPath,
            workspaceFolder.uri.fsPath,
          );
        }

        progress.report({ message: "Creating local Terraform plan..." });
        const storageUri =
          context.storageUri ??
          vscode.Uri.joinPath(context.globalStorageUri, "plans");
        const planJson = await createTerraformPlanJson(
          terraformPath,
          workspaceFolder.uri.fsPath,
          storageUri.fsPath,
          varFile?.fsPath,
        );
        progress.report({ message: "Scanning resolved plan..." });
        const controls = await loadControls(context);
        resultsPanel.show([
          {
            scanKind: "plan",
            filePath: varFile
              ? `Local plan using ${path.basename(varFile.fsPath)}`
              : "Local plan using automatic variable loading",
            findings: scanTerraformPlan(planJson, controls),
          },
        ]);
      } catch (error) {
        showScanError(resultsPanel, error);
      }
    },
  );
}

async function selectVariableFile(
  workspaceUri: vscode.Uri,
): Promise<vscode.Uri | undefined | null> {
  const choice = await vscode.window.showQuickPick(
    [
      {
        label: "Use automatic variable loading",
        description: "Terraform loads terraform.tfvars and *.auto.tfvars",
        value: false,
      },
      {
        label: "Select a .tfvars file",
        description: "Pass the selected file with -var-file",
        value: true,
      },
    ],
    { title: "Terraform variables for the local plan" },
  );
  if (!choice) {
    return null;
  }
  if (!choice.value) {
    return undefined;
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectMany: false,
    defaultUri: workspaceUri,
    filters: { "Terraform variables": ["tfvars", "json"] },
    openLabel: "Use Variable File",
    title: "Select the Terraform variable file",
  });
  return selected?.[0] ?? null;
}

function handleSavedDocument(
  document: vscode.TextDocument,
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
): void {
  const scanOnSave = getConfigurationValue(
    document.uri,
    "scanOnSave",
    true,
  );
  if (!scanOnSave || !document.uri.path.endsWith(".tf")) {
    return;
  }

  void loadControls(context)
    .then((controls) => {
      resultsPanel.refresh([
        {
          scanKind: "static",
          filePath: vscode.workspace.asRelativePath(document.uri, false),
          uri: document.uri.toString(),
          findings: scanTerraform(document.getText(), controls),
        },
      ]);
    })
    .catch((error: unknown) => {
      showScanError(resultsPanel, error);
    });
}

async function selectWorkspaceFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Open a Terraform workspace before scanning a plan.",
    );
    return undefined;
  }
  if (folders.length === 1) {
    return folders[0];
  }

  const selected = await vscode.window.showWorkspaceFolderPick({
    placeHolder: "Select the Terraform root module",
  });
  return selected;
}

function showScanError(
  resultsPanel: ResultsPanel,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  resultsPanel.showError(message);
  void vscode.window.showErrorMessage(
    `Azure compliance scan failed: ${message}`,
  );
}
