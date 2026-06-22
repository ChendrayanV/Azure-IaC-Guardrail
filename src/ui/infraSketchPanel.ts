import * as vscode from "vscode";
import { analyzeTerraformConfiguration } from "../core/configArchitecture";
import {
  renderGraphvizDot,
  renderGraphvizSvg,
} from "../core/graphvizDiagram";
import { parseTerraform } from "../core/terraformParser";
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
      await this.openEditableSvg(message.svg, message.label);
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
        await this.postDiagram({
          label: `${this.workspaceFolder!.name} Terraform configuration`,
          sourceKind: "configuration",
          analysis: analyzeTerraformConfiguration(resources),
          findings: [],
        });
      },
    );
  }

  private async postDiagram(
    payload: CloudCanvasDiagramPayload,
  ): Promise<void> {
    const graphvizDot = renderGraphvizDot(payload.analysis, {
      title: payload.label,
    });
    const previewDot = renderGraphvizDot(payload.analysis, {
      title: payload.label,
      includeIcons: false,
    });
    const graphvizSvg = await renderGraphvizSvg(previewDot);
    this.panel?.webview.postMessage({
      type: "diagramGenerated",
      payload: { ...payload, graphvizDot, graphvizSvg },
    });
  }

  private async openEditableSvg(svg: string, label: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument({
      language: "xml",
      content: `<!-- ${label} -->\n${svg}`,
    });
    await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
  }
}

type CloudCanvasMessage =
  | { type: "generateFromConfiguration" }
  | { type: "editSvg"; svg: string; label: string };

function isCloudCanvasMessage(
  message: unknown,
): message is CloudCanvasMessage {
  return (
    !!message &&
    typeof message === "object" &&
    ((message as Partial<CloudCanvasMessage>).type ===
      "generateFromConfiguration" ||
      ((message as Partial<CloudCanvasMessage>).type === "editSvg" &&
        typeof (message as Partial<{ svg: unknown }>).svg === "string" &&
        typeof (message as Partial<{ label: unknown }>).label === "string"))
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
