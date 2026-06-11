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
import { scanResources } from "./core/scanner";
import { parseTerraform } from "./core/terraformParser";
import { TerraformLanguageFeatures } from "./editor/terraformLanguageFeatures";
import { resolvedSourceFinding } from "./editor/findingProvenance";
import {
  createTerraformPlanJson,
  initializeBeforePlanFor,
  initializeTerraform,
  initializeTerraformForStaticScan,
  retainGeneratedPlanFor,
  showTerraformPlan,
  terraformPathFor,
} from "./terraform/terraformCli";
import {
  findTerraformRoot,
  resolveConfiguredTerraformRoot,
} from "./terraform/terraformRoot";
import { loadStaticWorkspace } from "./terraform/staticWorkspace";
import { ResultsPanel } from "./ui/resultsPanel";
import { InfraSketchPanel } from "./ui/infraSketchPanel";
import { PlanArchitecturePanel } from "./ui/planArchitecturePanel";
import { WorkspacePolicyPanel } from "./ui/workspacePolicyPanel";
import type {
  Control,
  Finding,
  PlanAnalysis,
  TerraformResource,
} from "./types";

let latestPlanView:
  | { analysis: PlanAnalysis; findings: Finding[]; label: string }
  | undefined;

const COMMANDS = {
  scanWorkspace: "infraCompliance.scanWorkspace",
  initializeAndScanWorkspace:
    "infraCompliance.initializeAndScanWorkspace",
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
    vscode.commands.registerCommand(
      COMMANDS.initializeAndScanWorkspace,
      () =>
        initializeAndScanWorkspace(
          context,
          resultsPanel,
          languageFeatures,
        ),
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

async function initializeAndScanWorkspace(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
  languageFeatures: TerraformLanguageFeatures,
): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Open a Terraform workspace before initializing modules.",
    );
    return;
  }
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Azure IaC Guardrail: Initializing Terraform modules",
    },
    async () => {
      for (const folder of folders) {
        const profile = await loadWorkspacePolicy(folder.uri.fsPath);
        const terraformRoot = resolveConfiguredTerraformRoot(
          folder.uri.fsPath,
          profile?.terraformRoot ?? ".",
        );
        await initializeTerraformForStaticScan(
          terraformPathFor(folder.uri),
          terraformRoot,
        );
      }
    },
  );
  await scanWorkspace(context, resultsPanel, languageFeatures);
}

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
    const diagnosticsByUri = new Map<string, Finding[]>();
    const results = workspaces.flatMap((workspace) => {
      const resources = workspace.terraformSources.flatMap((entry) =>
        parseTerraform(entry.source.content, entry.context, {
          sourcePath: entry.source.path,
          sourceUri: entry.uri,
          moduleAddress: entry.moduleAddress,
        }),
      );
      const findingsByUri = groupFindingsByUri(
        scanResources(resources, controls),
      );
      addResolvedSourceFindings(findingsByUri, workspace.workspacePath);
      for (const issue of workspace.issues) {
        const uri = vscode.Uri.file(issue.callerFilePath).toString();
        const existing = findingsByUri.get(uri) ?? [];
        existing.push(moduleIssueFinding(issue, uri));
        findingsByUri.set(uri, existing);
      }

      const sourceResults = workspace.terraformSources.map(
        (entry): FileScanResult => {
          const findings = (findingsByUri.get(entry.uri) ?? []).filter(
            (finding) =>
              finding.resource.moduleAddress === entry.moduleAddress ||
              (finding.resource.type === "terraform_module" &&
                finding.resource.sourcePath === entry.source.path),
          );
          return {
            scanKind: "static",
            filePath: entry.moduleAddress
              ? `${entry.source.path} (${entry.moduleAddress})`
              : entry.source.path,
            uri: entry.uri,
            findings,
          };
        },
      );
      const sourceUris = new Set(
        workspace.terraformSources.map((entry) => entry.uri),
      );
      for (const [uri, findings] of findingsByUri) {
        diagnosticsByUri.set(uri, [
          ...(diagnosticsByUri.get(uri) ?? []),
          ...findings,
        ]);
      }
      return [
        ...sourceResults,
        ...[...findingsByUri.entries()]
          .filter(
            ([uri]) =>
              !sourceUris.has(uri) &&
              !/\.tfvars(?:\.json)?$/i.test(vscode.Uri.parse(uri).fsPath),
          )
          .map(([uri, findings]): FileScanResult => ({
            scanKind: "static",
            filePath:
              findings[0]?.resource.sourcePath ?? "Terraform module",
            uri,
            findings,
          })),
      ];
    });
    languageFeatures.replace(diagnosticsByUri);
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
  const terraformRoot = await selectTerraformRoot(workspaceFolder);
  if (!terraformRoot) {
    return;
  }
  const varFile = await selectVariableFile(terraformRoot);
  if (varFile === null) {
    return;
  }

  const runScan = () =>
    runLocalPlanScan(
      context,
      resultsPanel,
      workspaceFolder,
      terraformRoot,
      varFile,
    );
  resultsPanel.setRescanHandler(runScan);
  await runScan();
}

async function runLocalPlanScan(
  context: vscode.ExtensionContext,
  resultsPanel: ResultsPanel,
  workspaceFolder: vscode.WorkspaceFolder,
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
        const profile = await loadWorkspacePolicy(
          workspaceFolder.uri.fsPath,
        );
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
  const selectedUri = selected?.[0];
  if (!selectedUri) {
    return null;
  }
  const relative = path.relative(workspaceUri.fsPath, selectedUri.fsPath);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    void vscode.window.showErrorMessage(
      "Select a Terraform variable file inside the configured Terraform root.",
    );
    return null;
  }
  return selectedUri;
}

async function selectTerraformRoot(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<vscode.Uri | undefined> {
  const profile = await loadWorkspacePolicy(workspaceFolder.uri.fsPath);
  if (profile) {
    const configured = resolveConfiguredTerraformRoot(
      workspaceFolder.uri.fsPath,
      profile.terraformRoot,
    );
    try {
      const stat = await fs.stat(configured);
      if (!stat.isDirectory()) {
        throw new Error("not a directory");
      }
      return vscode.Uri.file(configured);
    } catch {
      void vscode.window.showErrorMessage(
        `Configured Terraform root "${profile.terraformRoot}" does not exist. Update Azure Pre-configuration.`,
      );
      return undefined;
    }
  }
  const activeTerraformFile =
    vscode.window.activeTextEditor?.document.languageId === "terraform"
      ? vscode.window.activeTextEditor.document.uri.fsPath
      : undefined;
  const startPath =
    activeTerraformFile ?? workspaceFolder.uri.fsPath;
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
  if (
    !scanOnSave ||
    !(
      document.uri.path.endsWith(".tf") ||
      document.uri.path.endsWith(".tfvars") ||
      document.uri.path.endsWith(".tfvars.json")
    )
  ) {
    return;
  }

  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) {
    return;
  }
  void scanWorkspace(context, resultsPanel, languageFeatures)
    .catch((error: unknown) => {
      showScanError(resultsPanel, error);
    });
}

function groupFindingsByUri(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>();
  for (const finding of findings) {
    const uri = finding.resource.sourceUri;
    if (!uri) {
      continue;
    }
    const entries = grouped.get(uri) ?? [];
    entries.push(finding);
    grouped.set(uri, entries);
  }
  return grouped;
}

function addResolvedSourceFindings(
  grouped: Map<string, Finding[]>,
  workspacePath: string,
): void {
  const originals = [...grouped.values()].flat();
  for (const finding of originals) {
    const resolved = resolvedSourceFinding(workspacePath, finding);
    if (!resolved) {
      continue;
    }
    const uri = vscode.Uri.file(resolved.filePath).toString();
    const entries = grouped.get(uri) ?? [];
    const duplicate = entries.some(
      (entry) =>
        entry.control.id === finding.control.id &&
        entry.line === resolved.finding.line &&
        entry.resource.sourceUri === finding.resource.sourceUri,
    );
    if (duplicate) {
      continue;
    }
    entries.push(resolved.finding);
    grouped.set(uri, entries);
  }
}

function moduleIssueFinding(
  issue: {
    callerDisplayPath: string;
    moduleAddress: string;
    source: string;
    line: number;
    reason:
      | "not-installed"
      | "dynamic-source"
      | "missing-local-source"
      | "multiple-instances";
  },
  sourceUri: string,
): Finding {
  const reason =
    issue.reason === "not-installed"
      ? "Remote module is not initialized. Run the local plan scan or terraform init to download and index it."
      : issue.reason === "missing-local-source"
        ? "Local module source directory was not found."
        : issue.reason === "multiple-instances"
          ? "The module uses count or for_each. Static scanning checks its source once, but a Terraform plan is required to evaluate every module instance."
        : "Module source is dynamic and cannot be resolved by the static scanner.";
  const controlId =
    issue.reason === "multiple-instances"
      ? "IAC-MODULE-002"
      : "IAC-MODULE-001";
  const control: Control = {
    id: controlId,
    title:
      issue.reason === "multiple-instances"
        ? "Module instances require resolved plan evaluation"
        : "Module source must be available for static scanning",
    description:
      "Azure IaC Guardrail scans module resources only when their source code is available locally.",
    severity: "information",
    resourceTypes: ["terraform_module"],
    attribute: "source",
    operator: "exists",
    remediation: reason,
  };
  const resource: TerraformResource = {
    type: "terraform_module",
    name: issue.moduleAddress,
    sourcePath: issue.callerDisplayPath,
    sourceUri,
    moduleAddress: issue.moduleAddress,
    startLine: issue.line,
    attributes: new Map(),
  };
  return {
    outcome: "unresolved",
    control,
    resource,
    actual: issue.source,
    expected: "module source available locally",
    line: issue.line,
    startCharacter: 0,
    endCharacter: 1,
    message: `${control.id}: ${reason}`,
  };
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
  const profile = await loadWorkspacePolicy(folder.uri.fsPath);
  const terraformRoot = vscode.Uri.file(
    resolveConfiguredTerraformRoot(
      folder.uri.fsPath,
      profile?.terraformRoot ?? ".",
    ),
  );
  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    defaultUri: terraformRoot,
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
    path.relative(terraformRoot.fsPath, uri.fsPath).replaceAll("\\", "/"),
  );
  const outside = relativeFiles.find(
    (file) => file === ".." || file.startsWith("../"),
  );
  if (outside) {
    void vscode.window.showErrorMessage(
      "Static variable files must be inside the configured Terraform root.",
    );
    return;
  }
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
