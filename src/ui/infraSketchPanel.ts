import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { loadControls } from "../controls/catalog";
import { loadWorkspacePolicy } from "../controls/workspacePolicy";
import {
  generateTerraformFromSketch,
  normalizeInfraSketch,
  type InfraSketch,
  type SketchReferenceImage,
} from "../core/infraSketch";
import { extractImageDraft } from "../core/imageDraft";
import { scanTerraform } from "../core/scanner";
import {
  terraformPathFor,
  validateTerraformConfiguration,
} from "../terraform/terraformCli";
import {
  attachReferenceImageUri,
  saveSketch,
  selectWorkspaceFolder,
} from "./infraSketchWorkspace";
import {
  createNonce,
  renderSketchHtml,
} from "./infraSketchWebview";
import type { ResultsPanel } from "./resultsPanel";

const REFERENCE_IMAGE_DIRECTORY = ".azure-iac-guardrail/cloud-canvas";

export class InfraSketchPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private workspaceFolder: vscode.WorkspaceFolder | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly resultsPanel: ResultsPanel,
  ) {}

  async show(selectedFolder?: vscode.WorkspaceFolder): Promise<void> {
    const folder = selectedFolder ?? (await selectWorkspaceFolder());
    if (!folder) {
      return;
    }
    this.workspaceFolder = folder;
    const sketch: InfraSketch = {
      version: 1,
      nodes: [],
      connections: [],
    };
    const panel = this.getOrCreatePanel();
    panel.title = `Cloud Canvas: ${folder.name}`;
    const montserratUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "fonts",
        "Montserrat-VariableFont_wght.ttf",
      ),
    );
    const iconBaseUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "media",
        "cloud-canvas",
        "Azure_Public_Service_Icons",
        "Icons",
      ),
    );
    panel.webview.html = renderSketchHtml(
      attachReferenceImageUri(panel.webview, folder.uri, sketch),
      createNonce(),
      montserratUri.toString(),
      iconBaseUri.toString(),
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
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, "media"),
            ...(this.workspaceFolder ? [this.workspaceFolder.uri] : []),
          ],
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
    if (!isSketchMessage(message) || !this.workspaceFolder) {
      return;
    }
    try {
      const sketch = normalizeInfraSketch(message.sketch);
      if (message.type === "exportPng") {
        const destination = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.joinPath(
            this.workspaceFolder.uri,
            "azure-architecture.png",
          ),
          filters: { PNG: ["png"] },
          saveLabel: "Export PNG",
          title: "Export Azure architecture diagram",
        });
        if (!destination) {
          return;
        }
        await vscode.workspace.fs.writeFile(
          destination,
          Uint8Array.from(Buffer.from(message.data, "base64")),
        );
        void vscode.window.showInformationMessage(
          `Architecture diagram exported to ${vscode.workspace.asRelativePath(destination, false)}.`,
        );
        return;
      }
      if (message.type === "importReferenceImage") {
        const imported = await this.importReferenceImage(message.sketch);
        if (!imported) {
          return;
        }
        this.panel?.webview.postMessage({
          type: "referenceImageImported",
          referenceImage: imported,
        });
        return;
      }
      if (message.type === "removeReferenceImage") {
        const normalized = normalizeInfraSketch(message.sketch);
        await saveSketch(this.workspaceFolder.uri, normalized);
        return;
      }
      if (message.type === "generateDraftFromImage") {
        const draft = await this.generateDraftFromImage(message.sketch);
        if (!draft) {
          return;
        }
        this.panel?.webview.postMessage({
          type: "imageDraftGenerated",
          draft,
        });
        return;
      }
      const policy = await loadWorkspacePolicy(
        this.workspaceFolder.uri.fsPath,
      );
      const terraform = generateTerraformFromSketch(
        sketch,
        policy?.terraformVersion,
      );
      if (message.type === "validateTerraform") {
        const controls = await loadControls(this.context);
        const findings = scanTerraform(terraform, controls);
        this.resultsPanel.setRescanHandler();
        this.resultsPanel.show([
          {
            scanKind: "static",
            filePath: "Cloud Canvas/cloud-canvas.generated.tf",
            findings,
          },
        ]);
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Validating Cloud Canvas Terraform",
            cancellable: false,
          },
          async () => {
            const directory = await fs.mkdtemp(
              path.join(os.tmpdir(), "cloud-canvas-"),
            );
            try {
              await fs.writeFile(
                path.join(directory, "main.tf"),
                terraform,
                "utf8",
              );
              const result = await validateTerraformConfiguration(
                terraformPathFor(this.workspaceFolder!.uri),
                directory,
              );
              const noncompliant = findings.filter(
                (finding) => finding.outcome === "noncompliant",
              ).length;
              const unresolved = findings.filter(
                (finding) => finding.outcome === "unresolved",
              ).length;
              void vscode.window.showInformationMessage(
                `${result.trim() || "Cloud Canvas Terraform is valid."} Static scan: ${noncompliant} noncompliant, ${unresolved} unresolved.`,
              );
            } finally {
              await fs.rm(directory, { recursive: true, force: true });
            }
          },
        );
        return;
      }
      if (message.type === "previewTerraform") {
        const document = await vscode.workspace.openTextDocument({
          language: "terraform",
          content: terraform,
        });
        await vscode.window.showTextDocument(
          document,
          vscode.ViewColumn.Beside,
          true,
        );
        return;
      }
      const destination = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.joinPath(
          this.workspaceFolder.uri,
          "sketchyourinfra.generated.tf",
        ),
        filters: { Terraform: ["tf"] },
        saveLabel: "Generate Terraform",
        title: "Generate Terraform from infrastructure sketch",
      });
      if (!destination) {
        return;
      }
      await vscode.workspace.fs.writeFile(
        destination,
        new TextEncoder().encode(terraform),
      );
      await saveSketch(this.workspaceFolder.uri, sketch);
      const document = await vscode.workspace.openTextDocument(destination);
      await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      void vscode.window.showInformationMessage(
        `Terraform generated at ${vscode.workspace.asRelativePath(destination, false)}. Review it before planning.`,
      );
    } catch (error) {
      void vscode.window.showErrorMessage(
        `Cloud Canvas: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async importReferenceImage(
    sketch: unknown,
  ): Promise<(SketchReferenceImage & { uri: string }) | undefined> {
    if (!this.workspaceFolder || !this.panel) {
      return undefined;
    }
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        Images: ["png", "jpg", "jpeg", "svg", "webp"],
      },
      openLabel: "Import reference image",
      title: "Select a reference image for Cloud Canvas",
    });
    const source = selected?.[0];
    if (!source) {
      return undefined;
    }
    const normalized = normalizeInfraSketch(sketch);
    const destinationDirectory = vscode.Uri.joinPath(
      this.workspaceFolder.uri,
      REFERENCE_IMAGE_DIRECTORY,
    );
    await vscode.workspace.fs.createDirectory(destinationDirectory);
    const destination = vscode.Uri.joinPath(
      destinationDirectory,
      `${Date.now()}-${path.basename(source.fsPath).replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    );
    await vscode.workspace.fs.copy(source, destination, { overwrite: true });
    const relativePath = vscode.workspace.asRelativePath(
      destination,
      false,
    );
    normalized.referenceImage = {
      path: relativePath,
      x: normalized.referenceImage?.x ?? 120,
      y: normalized.referenceImage?.y ?? 120,
      width: normalized.referenceImage?.width ?? 880,
      opacity: normalized.referenceImage?.opacity ?? 0.42,
    };
    await saveSketch(this.workspaceFolder.uri, normalized);
    return {
      ...normalized.referenceImage,
      uri: this.panel.webview
        .asWebviewUri(destination)
        .toString(),
    };
  }

  private async generateDraftFromImage(
    sketch: unknown,
  ): Promise<
    | {
        source: "svg-text" | "filename" | "unrecognized";
        suggestions: Array<{
          serviceType: string;
          title: string;
          confidence: "high" | "medium" | "low";
          score: number;
          matchedOn: string[];
        }>;
        notes: string[];
      }
    | undefined
  > {
    if (!this.workspaceFolder) {
      return undefined;
    }
    const normalized = normalizeInfraSketch(sketch);
    const referenceImage = normalized.referenceImage;
    if (!referenceImage) {
      void vscode.window.showWarningMessage(
        "Import a reference image before generating a draft from image.",
      );
      return undefined;
    }
    const imageUri = vscode.Uri.joinPath(
      this.workspaceFolder.uri,
      referenceImage.path,
    );
    let content: string | undefined;
    if (path.extname(imageUri.fsPath).toLowerCase() === ".svg") {
      content = await fs.readFile(imageUri.fsPath, "utf8");
    }
    const draft = extractImageDraft(referenceImage.path, content);
    if (!draft.suggestions.length) {
      void vscode.window.showInformationMessage(
        "Cloud Canvas could not confidently detect Azure services from that image yet.",
      );
    }
    return draft;
  }
}

type SketchMessage =
  | { type: "exportPng"; sketch: unknown; data: string }
  | { type: "importReferenceImage"; sketch: unknown }
  | { type: "removeReferenceImage"; sketch: unknown }
  | { type: "generateDraftFromImage"; sketch: unknown }
  | { type: "validateTerraform"; sketch: unknown }
  | { type: "previewTerraform"; sketch: unknown }
  | { type: "generateTerraform"; sketch: unknown };

function isSketchMessage(message: unknown): message is SketchMessage {
  if (!message || typeof message !== "object") {
    return false;
  }
  const value = message as Partial<SketchMessage>;
  return (
    [
      "exportPng",
      "importReferenceImage",
      "removeReferenceImage",
      "generateDraftFromImage",
      "validateTerraform",
      "previewTerraform",
      "generateTerraform",
    ].includes(
      value.type ?? "",
    ) &&
    "sketch" in value &&
    (value.type !== "exportPng" ||
      typeof (value as Partial<{ data: string }>).data === "string")
  );
}



