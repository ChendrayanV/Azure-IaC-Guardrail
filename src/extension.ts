import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "./configuration";
import { loadControls } from "./controls/catalog";
import { loadWorkspacePolicy } from "./controls/workspacePolicy";
import {
  scanTerraformPlanDetailed,
} from "./core/planScanner";
import type { FileScanResult } from "./core/resultsHtml";
import { scanTerraform } from "./core/scanner";
import {
  createTerraformPlanJson,
  initializeBeforePlanFor,
  initializeTerraform,
  retainGeneratedPlanFor,
  showTerraformPlan,
  terraformPathFor,
} from "./terraform/terraformCli";
import { findTerraformRoot } from "./terraform/terraformRoot";
import { ResultsPanel } from "./ui/resultsPanel";
import { WorkspacePolicyPanel } from "./ui/workspacePolicyPanel";

const COMMANDS = {
  scanWorkspace: "infraCompliance.scanWorkspace",
  scanPlan: "infraCompliance.scanPlan",
  createAndScanPlan: "infraCompliance.createAndScanPlan",
  exportPdf: "infraCompliance.exportPdf",
  exportEvidence: "infraCompliance.exportEvidence",
  analyzePrChanges: "infraCompliance.analyzePrChanges",
  configureWorkspace: "infraCompliance.configureWorkspace",
} as const;

export function activate(context: vscode.ExtensionContext): void {
  const resultsPanel = new ResultsPanel(context.extensionUri);
  const workspacePolicyPanel = new WorkspacePolicyPanel();
  context.subscriptions.push(
    resultsPanel,
    workspacePolicyPanel,
    vscode.commands.registerCommand(COMMANDS.scanWorkspace, () =>
      scanWorkspace(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.scanPlan, () =>
      scanExistingPlan(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.createAndScanPlan, () =>
      createAndScanPlan(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.exportPdf, () =>
      resultsPanel.exportPdf(),
    ),
    vscode.commands.registerCommand(COMMANDS.exportEvidence, () =>
      resultsPanel.exportEvidencePack(),
    ),
    vscode.commands.registerCommand(COMMANDS.analyzePrChanges, () =>
      createAndScanPlan(context, resultsPanel),
    ),
    vscode.commands.registerCommand(COMMANDS.configureWorkspace, () =>
      workspacePolicyPanel.show(),
    ),
    vscode.workspace.onDidSaveTextDocument((document) =>
      handleSavedDocument(document, context, resultsPanel),
    ),
  );
  void showInitialTagSetup(context, workspacePolicyPanel);
}

export function deactivate(): void {}

async function showInitialTagSetup(
  context: vscode.ExtensionContext,
  panel: WorkspacePolicyPanel,
): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return;
  }
  const stateKey = `azurePreconfigurationPresentedV1:${folder.uri.toString()}`;
  if (
    context.workspaceState.get<boolean>(stateKey) ||
    (await loadWorkspacePolicy(folder.uri.fsPath))
  ) {
    return;
  }
  await context.workspaceState.update(stateKey, true);
  await panel.show(folder);
}

async function scanWorkspace(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
): Promise<void> {
  resultsPanel.setRescanHandler();
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

  resultsPanel.setRescanHandler();
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
        const scan = scanTerraformPlanDetailed(planJson, controls);
        resultsPanel.show([
          {
            scanKind: "plan",
            filePath: vscode.workspace.asRelativePath(planUri, false),
            findings: scan.findings,
            analysis: scan.analysis,
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
  const terraformRoot = await selectTerraformRoot(workspaceFolder, varFile);
  if (!terraformRoot) {
    return;
  }

  const runScan = () =>
    runLocalPlanScan(context, resultsPanel, terraformRoot, varFile);
  resultsPanel.setRescanHandler(runScan);
  await runScan();
}

async function runLocalPlanScan(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
  terraformRoot: vscode.Uri,
  varFile: vscode.Uri | undefined,
): Promise<void> {
  const rootLabel = vscode.workspace.asRelativePath(terraformRoot, false);
  resultsPanel.showPlanProgress(
    "prepare",
    varFile
      ? `Using ${path.basename(varFile.fsPath)} in ${rootLabel}`
      : `Using Terraform automatic variable loading in ${rootLabel}`,
  );
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Azure IaC Guardrail: Local plan scan",
    },
    async (progress) => {
      try {
        const terraformPath = terraformPathFor(terraformRoot);
        if (initializeBeforePlanFor(terraformRoot)) {
          progress.report({
            message: "Initializing Terraform providers...",
            increment: 20,
          });
          resultsPanel.showPlanProgress(
            "initialize",
            "Initializing providers and preparing the Terraform working directory...",
          );
          await initializeTerraform(
            terraformPath,
            terraformRoot.fsPath,
          );
        }

        progress.report({
          message: "Creating and resolving the local Terraform plan...",
          increment: 45,
        });
        resultsPanel.showPlanProgress(
          "plan",
          "Running terraform plan and converting resolved values for evaluation...",
        );
        const storageUri =
          context.storageUri ??
          vscode.Uri.joinPath(context.globalStorageUri, "plans");
        const retainedPlanPath = retainGeneratedPlanFor(terraformRoot)
          ? path.join(
              terraformRoot.fsPath,
              ".azure-iac-guardrail",
              "plans",
              "latest.tfplan",
            )
          : undefined;
        const { planJson, planPath } = await createTerraformPlanJson(
          terraformPath,
          terraformRoot.fsPath,
          storageUri.fsPath,
          varFile?.fsPath,
          retainedPlanPath,
        );
        progress.report({
          message: "Evaluating Azure standards...",
          increment: 30,
        });
        resultsPanel.showPlanProgress(
          "evaluate",
          "Applying bundled controls, tag requirements, and workspace exclusions...",
        );
        const controls = await loadControls(context);
        const scan = scanTerraformPlanDetailed(planJson, controls);
        resultsPanel.show([
          {
            scanKind: "plan",
            filePath: varFile
              ? `Local plan using ${path.basename(varFile.fsPath)}`
              : "Local plan using automatic variable loading",
            findings: scan.findings,
            analysis: scan.analysis,
          },
        ]);
        progress.report({ message: "Scan complete", increment: 5 });
        if (planPath) {
          void vscode.window.showInformationMessage(
            `Terraform plan retained at ${vscode.workspace.asRelativePath(planPath, false)}.`,
          );
        }
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
    filters: {
      "Terraform variables": ["tfvars", "json", "example"],
      "All files": ["*"],
    },
    openLabel: "Use Variable File",
    title: "Select the Terraform variable file",
  });
  return selected?.[0] ?? null;
}

async function selectTerraformRoot(
  workspaceFolder: vscode.WorkspaceFolder,
  varFile: vscode.Uri | undefined,
): Promise<vscode.Uri | undefined> {
  const activeTerraformFile =
    vscode.window.activeTextEditor?.document.languageId === "terraform"
      ? vscode.window.activeTextEditor.document.uri.fsPath
      : undefined;
  const startPath =
    varFile?.fsPath ?? activeTerraformFile ?? workspaceFolder.uri.fsPath;
  const detectedRoot = await findTerraformRoot(
    workspaceFolder.uri.fsPath,
    startPath,
  );
  if (detectedRoot) {
    return vscode.Uri.file(detectedRoot);
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: workspaceFolder.uri,
    openLabel: "Use Terraform Root",
    title: "Select the Terraform root module",
  });
  return selected?.[0];
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
