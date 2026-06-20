import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import { analyzeTerraformConfiguration } from "../core/configArchitecture";
import { analyzeTerraformPlan } from "../core/planAnalysis";
import { parseTerraform } from "../core/terraformParser";
import {
  showTerraformPlan,
  terraformPathFor,
} from "../terraform/terraformCli";
import { loadStaticWorkspace } from "../terraform/staticWorkspace";
import {
  createNonce,
  renderSketchHtml,
  type CloudCanvasDiagramPayload,
} from "./infraSketchWebview";

export class InfraSketchPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async show(selectedFolder?: vscode.WorkspaceFolder): Promise<void> {
    const folder = selectedFolder ?? (await selectWorkspaceFolder());
    if (!folder) {
      return;
    }
    this.workspaceFolder = folder;
    const panel = this.getOrCreatePanel();
    panel.title = `Cloud Canvas: ${folder.name}`;
    panel.webview.html = renderSketchHtml(
      createNonce(),
      panel.webview.cspSource,
    );
    panel.reveal(vscode.ViewColumn.Active, false);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private getOrCreatePanel(): vscode.WebviewPanel {
    if (!this.panel) {
      const panel = vscode.window.createWebviewPanel(
        "infraCompliance.sketchYourInfra",
        "Cloud Canvas",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [this.context.extensionUri],
        },
      );
      panel.onDidDispose(() => {
        this.panel = undefined;
      });
      panel.webview.onDidReceiveMessage((message: unknown) => {
        void this.handleMessage(message);
      });
      this.panel = panel;
    }
    return this.panel;
  }

  private async handleMessage(message: unknown): Promise<void> {
    if (!isCloudCanvasMessage(message) || !this.workspaceFolder) {
      return;
    }
    try {
      if (message.type === "generateFromConfiguration") {
        await this.generateFromConfiguration();
        return;
      }
      await this.generateFromPlanFile();
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Cloud Canvas could not generate the diagram: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async generateFromConfiguration(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Generating Azure architecture from Terraform configuration",
      },
      async () => {
        const workspace = await loadStaticWorkspace(this.workspaceFolder!);
        const resources = workspace.terraformSources.flatMap((entry) =>
          parseTerraform(entry.source.content, entry.context, {
            sourcePath: entry.source.path,
            sourceUri: entry.uri,
            moduleAddress: entry.moduleAddress,
          }),
        );
        if (resources.length === 0) {
          throw new Error("No Terraform resource blocks were found in the configured Terraform root.");
        }
        this.postDiagram({
          label: `${this.workspaceFolder!.name} Terraform configuration`,
          sourceKind: "configuration",
          analysis: analyzeTerraformConfiguration(resources),
          findings: [],
        });
      },
    );
  }

  private async generateFromPlanFile(): Promise<void> {
    if (!this.workspaceFolder) {
      return;
    }
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      defaultUri: this.workspaceFolder.uri,
      filters: {
        "Terraform plans": ["tfplan", "json"],
        "All files": ["*"],
      },
      openLabel: "Generate Diagram",
      title: "Select a Terraform plan or terraform show JSON file",
    });
    const planUri = selected?.[0];
    if (!planUri) {
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Generating Azure architecture from Terraform plan",
      },
      async () => {
        const planJson = planUri.fsPath.endsWith(".json")
          ? await fs.readFile(planUri.fsPath, "utf8")
          : await showTerraformPlan(
              terraformPathFor(this.workspaceFolder!.uri),
              planUri.fsPath,
              this.workspaceFolder!.uri.fsPath,
            );
        this.postDiagram({
          label: path.basename(planUri.fsPath),
          sourceKind: "plan",
          analysis: analyzeTerraformPlan(planJson, []),
          findings: [],
        });
      },
    );
  }

  private postDiagram(payload: CloudCanvasDiagramPayload): void {
    this.panel?.webview.postMessage({
      type: "diagramGenerated",
      payload,
    });
  }
}

type CloudCanvasMessage =
  | { type: "generateFromConfiguration" }
  | { type: "generateFromPlan" };

function isCloudCanvasMessage(
  message: unknown,
): message is CloudCanvasMessage {
  return (
    !!message &&
    typeof message === "object" &&
    ["generateFromConfiguration", "generateFromPlan"].includes(
      String((message as Partial<CloudCanvasMessage>).type ?? ""),
    )
  );
}

async function selectWorkspaceFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Open a Terraform workspace before generating an Azure architecture diagram.",
    );
    return undefined;
  }
  return folders.length === 1
    ? folders[0]
    : vscode.window.showWorkspaceFolderPick({
        placeHolder: "Select the Terraform workspace to diagram",
      });
}
