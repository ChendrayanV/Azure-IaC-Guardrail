import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { getConfigurationValue } from "./configuration";
import { loadControls } from "./controls/catalog";
import { loadWorkspacePolicy } from "./controls/workspacePolicy";
import { estimateTerraformPlanCosts } from "./core/costEstimator";
import {
  compareTerraformPlans,
  renderPlanComparisonMarkdown,
} from "./core/planComparison";
import { scanTerraformPlanDetailed } from "./core/planScanner";
import type { FileScanResult } from "./core/resultsHtml";
import { scanTerraformWithContext } from "./core/scanner";
import { TerraformLanguageFeatures } from "./editor/terraformLanguageFeatures";
import {
  createTerraformPlanJson,
  initializeBeforePlanFor,
  initializeTerraform,
  retainGeneratedPlanFor,
  showTerraformPlan,
  terraformPathFor,
} from "./terraform/terraformCli";
import { findTerraformRoot } from "./terraform/terraformRoot";
import { loadStaticWorkspace } from "./terraform/staticWorkspace";
import { ResultsPanel } from "./ui/resultsPanel";
import { InfraSketchPanel } from "./ui/infraSketchPanel";
import { PlanArchitecturePanel } from "./ui/planArchitecturePanel";
import { WorkspacePolicyPanel } from "./ui/workspacePolicyPanel";
import type { Finding, PlanAnalysis } from "./types";

let latestPlanView:
  | { analysis: PlanAnalysis; findings: Finding[]; label: string }
  | undefined;

const COMMANDS = {
  scanWorkspace: "infraCompliance.scanWorkspace",
  scanPlan: "infraCompliance.scanPlan",
  createAndScanPlan: "infraCompliance.createAndScanPlan",
  exportPdf: "infraCompliance.exportPdf",
  exportEvidence: "infraCompliance.exportEvidence",
  analyzePrChanges: "infraCompliance.analyzePrChanges",
  configureWorkspace: "infraCompliance.configureWorkspace",
  configureStaticVariables: "infraCompliance.configureStaticVariables",
  visualizePlan: "infraCompliance.visualizePlan",
  comparePlans: "infraCompliance.comparePlans",
  sketchYourInfra: "sketchyourinfra",
} as const;

export function activate(context: vscode.ExtensionContext): void {
  const resultsPanel = new ResultsPanel(context.extensionUri);
  const workspacePolicyPanel = new WorkspacePolicyPanel();
  const infraSketchPanel = new InfraSketchPanel(context, resultsPanel);
  const planArchitecturePanel = new PlanArchitecturePanel();
  const languageFeatures = new TerraformLanguageFeatures(context);
  context.subscriptions.push(
    resultsPanel,
    workspacePolicyPanel,
    infraSketchPanel,
    planArchitecturePanel,
    languageFeatures,
    vscode.commands.registerCommand(COMMANDS.scanWorkspace, () =>
      scanWorkspace(context, resultsPanel, languageFeatures),
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
    vscode.commands.registerCommand(COMMANDS.configureStaticVariables, () =>
      configureStaticVariables(),
    ),
    vscode.commands.registerCommand(COMMANDS.visualizePlan, () =>
      latestPlanView
        ? planArchitecturePanel.show(
            latestPlanView.analysis,
            latestPlanView.findings,
            latestPlanView.label,
          )
        : visualizeExistingPlan(context, planArchitecturePanel),
    ),
    vscode.commands.registerCommand(COMMANDS.comparePlans, () =>
      compareExistingPlans(),
    ),
    vscode.commands.registerCommand(COMMANDS.sketchYourInfra, () =>
      infraSketchPanel.show(),
    ),
    vscode.workspace.onDidSaveTextDocument((document) =>
      handleSavedDocument(document, context, resultsPanel, languageFeatures),
    ),
  );
  void loadControls(context).then((controls) =>
    languageFeatures.setControls(controls),
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
  languageFeatures: TerraformLanguageFeatures,
): Promise<void> {
  resultsPanel.setRescanHandler();
  resultsPanel.showLoading();
  try {
    const controls = await loadControls(context);
    languageFeatures.setControls(controls);
    const workspaces = await Promise.all(
      (vscode.workspace.workspaceFolders ?? []).map(loadStaticWorkspace),
    );
    const results = workspaces.flatMap((workspace) =>
      [...workspace.terraformSources.entries()].map(
        ([uri, source]): FileScanResult => {
          const findings = scanTerraformWithContext(
            source.content,
            controls,
            workspace.context,
          );
          languageFeatures.update(vscode.Uri.parse(uri), findings);
          return {
            scanKind: "static",
            filePath: source.path,
            uri,
            findings,
          };
        },
      ),
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
        latestPlanView = {
          analysis: scan.analysis,
          findings: scan.findings,
          label: path.basename(planUri.fsPath),
        };
        const profile = await loadWorkspacePolicy(
          workspaceFolder.uri.fsPath,
        );
        scan.analysis.cost = await estimateTerraformPlanCosts(planJson, {
          assumptions: profile?.costAssumptions,
        });
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
        latestPlanView = {
          analysis: scan.analysis,
          findings: scan.findings,
          label: varFile
            ? `Local plan using ${path.basename(varFile.fsPath)}`
            : "Local plan using automatic variable loading",
        };
        const profile = await loadWorkspacePolicy(terraformRoot.fsPath);
        scan.analysis.cost = await estimateTerraformPlanCosts(planJson, {
          assumptions: profile?.costAssumptions,
        });
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
  languageFeatures: TerraformLanguageFeatures,
): void {
  const scanOnSave = getConfigurationValue(
    document.uri,
    "scanOnSave",
    true,
  );
  if (!scanOnSave || !document.uri.path.endsWith(".tf")) {
    return;
  }

  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) {
    return;
  }
  void Promise.all([loadControls(context), loadStaticWorkspace(folder)])
    .then(([controls, workspace]) => {
      languageFeatures.setControls(controls);
      const findings = scanTerraformWithContext(
        document.getText(),
        controls,
        workspace.context,
      );
      languageFeatures.update(document.uri, findings);
      resultsPanel.refresh([
        {
          scanKind: "static",
          filePath: vscode.workspace.asRelativePath(document.uri, false),
          uri: document.uri.toString(),
          findings,
        },
      ]);
    })
    .catch((error: unknown) => {
      showScanError(resultsPanel, error);
    });
}

async function visualizeExistingPlan(
  context: vscode.ExtensionContext,
  panel: PlanArchitecturePanel,
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
    openLabel: "Open Architecture",
    title: "Select a Terraform plan or plan JSON",
  });
  const planUri = selected?.[0];
  if (!planUri) {
    return;
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Building Terraform plan architecture",
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
        const scan = scanTerraformPlanDetailed(
          planJson,
          await loadControls(context),
        );
        latestPlanView = {
          analysis: scan.analysis,
          findings: scan.findings,
          label: path.basename(planUri.fsPath),
        };
        panel.show(scan.analysis, scan.findings, path.basename(planUri.fsPath));
      } catch (error) {
        void vscode.window.showErrorMessage(
          `Plan architecture failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );
}

async function configureStaticVariables(): Promise<void> {
  const folder = await selectWorkspaceFolder();
  if (!folder) {
    return;
  }
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    defaultUri: folder.uri,
    filters: {
      "Terraform variables": ["tfvars", "json", "example"],
      "All files": ["*"],
    },
    openLabel: "Use for Static Scan",
    title: "Select variable files for static scanning",
  });
  if (!selected) {
    return;
  }
  const relativeFiles = selected.map((uri) =>
    path.relative(folder.uri.fsPath, uri.fsPath).replaceAll("\\", "/"),
  );
  await vscode.workspace
    .getConfiguration("azureIacGuardrail", folder.uri)
    .update(
      "staticVarFiles",
      relativeFiles,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  void vscode.window.showInformationMessage(
    relativeFiles.length > 0
      ? `Static scans will use ${relativeFiles.join(", ")}.`
      : "Static scans will use Terraform automatic variable loading.",
  );
}

async function compareExistingPlans(): Promise<void> {
  const folder = await selectWorkspaceFolder();
  if (!folder) {
    return;
  }
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    defaultUri: folder.uri,
    filters: {
      "Terraform plans": ["tfplan", "json"],
      "All files": ["*"],
    },
    openLabel: "Compare Plans",
    title: "Select baseline and candidate Terraform plans",
  });
  if (!selected || selected.length !== 2) {
    if (selected) {
      void vscode.window.showWarningMessage(
        "Select exactly two Terraform plans: baseline first, candidate second.",
      );
    }
    return;
  }
  const [baselineUri, candidateUri] = selected;
  const terraformPath = terraformPathFor(folder.uri);
  const readPlan = (uri: vscode.Uri) =>
    uri.fsPath.endsWith(".json")
      ? fs.readFile(uri.fsPath, "utf8")
      : showTerraformPlan(terraformPath, uri.fsPath, folder.uri.fsPath);
  try {
    const [baseline, candidate] = await Promise.all([
      readPlan(baselineUri),
      readPlan(candidateUri),
    ]);
    const markdown = renderPlanComparisonMarkdown(
      compareTerraformPlans(baseline, candidate),
      path.basename(baselineUri.fsPath),
      path.basename(candidateUri.fsPath),
    );
    const document = await vscode.workspace.openTextDocument({
      language: "markdown",
      content: markdown,
    });
    await vscode.window.showTextDocument(document, vscode.ViewColumn.Active);
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Plan comparison failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
